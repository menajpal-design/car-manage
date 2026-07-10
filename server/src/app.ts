import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import { UserRole, SocketEvent, TicketType, TicketStatus, PaymentMethod, TransactionStatus, ExpenseCategory, IncomeSource } from '@fleetmaster/shared';
import { connectDB } from './config/db';
import mongoose, { Types } from 'mongoose';
import { Company } from './models/Company';
import { User } from './models/User';
import { Vehicle } from './models/Vehicle';
import { FuelLog } from './models/FuelLog';
import { Ticket } from './models/Ticket';
import { Invoice } from './models/Invoice';
import { Transaction } from './models/Transaction';
import { Expense } from './models/Expense';
import { Income } from './models/Income';
import { LocationLog } from './models/LocationLog';
import { authenticate } from './middleware/auth';
import { authorize } from './middleware/rbac';
import { sendSMS } from './services/sms';
import { uploadFile, getSignedFileUrl, deleteFile } from './services/s3';
import { scanFile } from './services/virusScanner';
import { startScheduler, setSocketServerForScheduler, runExpiryChecks } from './services/scheduler';

// Load environment variables
dotenv.config();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'https://fleet-web.duckdns.org',
  'https://fleet-driver.duckdns.org',
  ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
];

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Configure Multer for secure document, voice notes, and odometer photo uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB size limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'application/pdf',
      'audio/wav',
      'audio/mpeg',
      'audio/mp3',
      'audio/mp4',
      'audio/m4a',
      'audio/x-m4a',
      'audio/webm',
      'audio/ogg'
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file format. Only JPEG, PNG, PDF, and audio logs are allowed.'));
    }
  },
});

// Setup Ticket Multi-file Multer parser
const ticketUploadFields = upload.fields([
  { name: 'images', maxCount: 3 },
  { name: 'voiceNote', maxCount: 1 },
  { name: 'odometerPhoto', maxCount: 1 },
]);

// Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Serve local uploads statically for mock storage fallback
const uploadsPath = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// Socket.io Setup
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);
  socket.on(SocketEvent.LOCATION_UPDATE, (data) => {
    socket.broadcast.emit(SocketEvent.LOCATION_UPDATE, data);
  });
  socket.on('disconnect', () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

// Helper: Generate Access and Refresh Tokens
const generateTokens = (user: any) => {
  const secret = process.env.JWT_SECRET || 'super_secret_jwt_signing_key_change_me_in_production';
  const companyId = user.companyId ? user.companyId.toString() : '';

  const accessToken = jwt.sign(
    {
      userId: user.id || user._id,
      phone: user.phone,
      role: user.role,
      name: user.name,
      companyId,
    },
    secret,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.id || user._id,
    },
    secret,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// Helper: Set Cookies
const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
  };

  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000,
  });

  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

// Helper: Clear Cookies
const clearAuthCookies = (res: Response) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
  };

  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
};

// Helper: Map signed S3 URLs for documents
const populateVehicleSignedUrls = async (vehicle: any) => {
  const populatedDocs = [];
  for (const doc of vehicle.documents) {
    try {
      const signedUrl = await getSignedFileUrl(doc.documentUrl);
      populatedDocs.push({
        id: doc._id || doc.id,
        type: doc.type,
        documentUrl: signedUrl,
        rawKey: doc.documentUrl,
        issueDate: doc.issueDate,
        expiryDate: doc.expiryDate,
        isVerified: doc.isVerified,
      });
    } catch (err) {
      console.error(`Failed to sign URL for document: ${doc.documentUrl}`, err);
      populatedDocs.push(doc);
    }
  }

  const result = vehicle.toJSON();
  result.documents = populatedDocs;
  return result;
};

// Helper: Sign Ticket media URLs
const populateTicketSignedUrls = async (ticket: any) => {
  const signedImages = [];
  for (const key of ticket.images) {
    try {
      signedImages.push(await getSignedFileUrl(key));
    } catch (err) {
      signedImages.push(key);
    }
  }

  let signedVoice = undefined;
  if (ticket.voiceNoteUrl) {
    try {
      signedVoice = await getSignedFileUrl(ticket.voiceNoteUrl);
    } catch {
      signedVoice = ticket.voiceNoteUrl;
    }
  }

  const ticketObj = ticket.toJSON();
  ticketObj.images = signedImages;
  if (signedVoice) {
    ticketObj.voiceNoteUrl = signedVoice;
  }
  return ticketObj;
};

// --- AUTHENTICATION API ENDPOINTS ---

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

app.post('/api/auth/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { companyName, phone, password, name, email } = req.body;

    if (!companyName || !phone || !password || !name) {
      return res.status(400).json({ message: 'Company name, owner name, phone, and password are required.' });
    }

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return res.status(400).json({ message: 'A user with this phone number already exists.' });
    }

    const company = new Company({ name: companyName, phone });
    await company.save();

    const owner = new User({
      name,
      phone,
      email,
      passwordHash: password,
      role: UserRole.OWNER,
      companyId: company._id,
    });
    await owner.save();

    const { accessToken, refreshToken } = generateTokens(owner);
    setAuthCookies(res, accessToken, refreshToken);

    res.status(201).json({
      message: 'Company and Owner registered successfully',
      user: {
        id: owner.id,
        name: owner.name,
        phone: owner.phone,
        email: owner.email,
        role: owner.role,
        companyId: owner.companyId,
      },
      company,
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/auth/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ message: 'Phone number and password are required.' });
    }

    const user = await User.findOne({ phone }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({ message: 'Invalid phone number or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid phone number or password.' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account is deactivated. Contact administrator.' });
    }

    const company = await Company.findById(user.companyId);

    let assignedVehicle = null;
    if (user.role === UserRole.DRIVER || user.role === UserRole.HELPER) {
      if (user.assignedVehicleId) {
        assignedVehicle = await Vehicle.findById(user.assignedVehicleId);
      }
    }

    const { accessToken, refreshToken } = generateTokens(user);
    setAuthCookies(res, accessToken, refreshToken);

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        assignedVehicleId: user.assignedVehicleId,
      },
      company,
      assignedVehicle,
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/auth/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ message: 'Refresh token is required.' });
    }

    const secret = process.env.JWT_SECRET || 'super_secret_jwt_signing_key_change_me_in_production';
    let decoded: any;

    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return res.status(401).json({ message: 'Invalid or expired refresh token.' });
    }

    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User is inactive or no longer exists.' });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(user);
    setAuthCookies(res, newAccessToken, newRefreshToken);

    res.status(200).json({ message: 'Token refreshed successfully' });
  } catch (err) {
    next(err);
  }
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  clearAuthCookies(res);
  res.status(200).json({ message: 'Logout successful' });
});

// --- USER MANAGEMENT API ENDPOINTS ---

app.post(
  '/api/users',
  authenticate,
  authorize(UserRole.OWNER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, phone, role, email, licenseNumber, licenseExpiry, assignedVehicleId } = req.body;

      if (!name || !phone || !role) {
        return res.status(400).json({ message: 'Name, phone, and role are required.' });
      }

      if (role === UserRole.OWNER) {
        return res.status(400).json({ message: 'Cannot create an additional owner account.' });
      }

      const existingUser = await User.findOne({ phone });
      if (existingUser) {
        return res.status(400).json({ message: 'A user with this phone number already exists.' });
      }

      const tempPassword = Math.random().toString(36).slice(-8);

      const newUser = new User({
        name,
        phone,
        email,
        role,
        licenseNumber,
        licenseExpiry,
        assignedVehicleId: assignedVehicleId || undefined,
        passwordHash: tempPassword,
        companyId: req.user?.companyId,
      });

      await newUser.save();

      if (assignedVehicleId && role === UserRole.DRIVER) {
        await Vehicle.findByIdAndUpdate(assignedVehicleId, { assignedDriver: newUser._id });
      }

      const smsBody = `Welcome to FleetMaster Pro! Your login details: Phone: ${phone}, Password: ${tempPassword}. Link: http://localhost:3001/login`;
      await sendSMS(phone, smsBody);

      res.status(201).json({
        message: 'Employee created and credentials dispatched via SMS.',
        user: {
          id: newUser.id,
          name: newUser.name,
          phone: newUser.phone,
          email: newUser.email,
          role: newUser.role,
          companyId: newUser.companyId,
          assignedVehicleId: newUser.assignedVehicleId,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

app.get(
  '/api/users',
  authenticate,
  authorize(UserRole.OWNER, UserRole.TECHNICIAN, UserRole.MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filter: any = {};
      if (req.user?.role !== UserRole.ADMIN) {
        filter.companyId = req.user?.companyId;
      }
      const users = await User.find(filter).populate('assignedVehicleId');
      
      res.status(200).json({ users });
    } catch (err) {
      next(err);
    }
  }
);

app.put(
  '/api/users/:id',
  authenticate,
  authorize(UserRole.OWNER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, phone, role, email, licenseNumber, licenseExpiry, assignedVehicleId, isActive } = req.body;

      const user = await User.findOne({ _id: id, companyId: req.user?.companyId });
      if (!user) {
        return res.status(404).json({ message: 'User not found in your company.' });
      }

      if (phone && phone !== user.phone) {
        const phoneConflict = await User.findOne({ phone });
        if (phoneConflict) {
          return res.status(400).json({ message: 'A user with this phone number already exists.' });
        }
        user.phone = phone;
      }

      if (name) user.name = name;
      if (email !== undefined) user.email = email;
      if (role && role !== UserRole.OWNER) user.role = role as UserRole;
      if (licenseNumber !== undefined) user.licenseNumber = licenseNumber;
      if (licenseExpiry !== undefined) user.licenseExpiry = licenseExpiry;
      if (isActive !== undefined) user.isActive = isActive;
      
      if (assignedVehicleId !== undefined) {
        const oldVehicleId = user.assignedVehicleId;
        user.assignedVehicleId = assignedVehicleId || undefined;

        if (oldVehicleId && oldVehicleId !== assignedVehicleId) {
          await Vehicle.findByIdAndUpdate(oldVehicleId, { $unset: { assignedDriver: "" } });
        }
        if (assignedVehicleId) {
          await Vehicle.findByIdAndUpdate(assignedVehicleId, { assignedDriver: user._id });
        }
      }

      await user.save();
      res.status(200).json({ message: 'User updated successfully', user });
    } catch (err) {
      next(err);
    }
  }
);

app.delete(
  '/api/users/:id',
  authenticate,
  authorize(UserRole.OWNER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const user = await User.findOne({ _id: id, companyId: req.user?.companyId });
      if (!user) {
        return res.status(404).json({ message: 'User not found in your company.' });
      }

      user.isActive = false;
      await user.save();
      res.status(200).json({ message: 'User successfully deactivated (soft-deleted).' });
    } catch (err) {
      next(err);
    }
  }
);

// --- VEHICLE PROFILE & DOCUMENT VAULT ENDPOINTS ---

app.post(
  '/api/vehicles',
  authenticate,
  authorize(UserRole.OWNER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { regNumber, brand, model, year, engineNo, chassisNo, fuelType, currentOdometer, assignedDriver, assignedHelper, gpsDeviceId } = req.body;

      if (!regNumber || !brand || !model || !year || !engineNo || !chassisNo || !fuelType) {
        return res.status(400).json({ message: 'All profile registration fields are required.' });
      }

      const existingVehicle = await Vehicle.findOne({ regNumber });
      if (existingVehicle) {
        return res.status(400).json({ message: 'A vehicle with this registration number already exists.' });
      }

      const vehicle = new Vehicle({
        regNumber,
        brand,
        model,
        year,
        engineNo,
        chassisNo,
        fuelType,
        currentOdometer: currentOdometer || 0,
        lastServiceOdometer: currentOdometer || 0,
        lastFuelOdometer: currentOdometer || 0,
        assignedDriver: assignedDriver || undefined,
        assignedHelper: assignedHelper || undefined,
        ownerCompanyId: req.user?.companyId,
        gpsDeviceId: gpsDeviceId || undefined,
      });

      await vehicle.save();

      if (assignedDriver) {
        await User.findByIdAndUpdate(assignedDriver, { assignedVehicleId: vehicle._id });
      }
      if (assignedHelper) {
        await User.findByIdAndUpdate(assignedHelper, { assignedVehicleId: vehicle._id });
      }

      res.status(201).json({
        message: 'Vehicle profile established successfully.',
        vehicle,
      });
    } catch (err) {
      next(err);
    }
  }
);

app.get(
  '/api/vehicles',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, fuelType, search } = req.query;
      const query: any = {};
      if (req.user?.role !== UserRole.ADMIN) {
        query.ownerCompanyId = req.user?.companyId;
      }

      if (status) {
        query.status = status;
      }
      if (fuelType) {
        query.fuelType = fuelType;
      }
      if (search) {
        query.$or = [
          { regNumber: { $regex: search, $options: 'i' } },
          { brand: { $regex: search, $options: 'i' } },
          { model: { $regex: search, $options: 'i' } },
        ];
      }

      const vehicles = await Vehicle.find(query)
        .populate('assignedDriver')
        .populate('assignedHelper');

      const populatedVehicles = [];
      for (const vehicle of vehicles) {
        populatedVehicles.push(await populateVehicleSignedUrls(vehicle));
      }

      res.status(200).json({ vehicles: populatedVehicles });
    } catch (err) {
      next(err);
    }
  }
);

app.get(
  '/api/vehicles/expiring-documents',
  authenticate,
  authorize(UserRole.OWNER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(today.getDate() + 7);
      sevenDaysFromNow.setHours(23, 59, 59, 999);

      const vehicles = await Vehicle.find({
        ownerCompanyId: req.user?.companyId,
        'documents.expiryDate': { $gte: today, $lte: sevenDaysFromNow },
      });

      const expiringDocuments: any[] = [];
      for (const vehicle of vehicles) {
        for (const doc of vehicle.documents) {
          const expiry = new Date(doc.expiryDate);
          if (expiry >= today && expiry <= sevenDaysFromNow) {
            const signedUrl = await getSignedFileUrl(doc.documentUrl);
            expiringDocuments.push({
              vehicleId: vehicle._id,
              regNumber: vehicle.regNumber,
              brand: vehicle.brand,
              model: vehicle.model,
              document: {
                id: (doc as any)._id || (doc as any).id,
                type: doc.type,
                documentUrl: signedUrl,
                issueDate: doc.issueDate,
                expiryDate: doc.expiryDate,
                isVerified: doc.isVerified,
              },
            });
          }
        }
      }

      res.status(200).json({ expiringDocuments });
    } catch (err) {
      next(err);
    }
  }
);

app.get(
  '/api/vehicles/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const vehicle = await Vehicle.findOne({ _id: id, ownerCompanyId: req.user?.companyId })
        .populate('assignedDriver')
        .populate('assignedHelper');

      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle profile not found.' });
      }

      const vehicleWithSignedUrls = await populateVehicleSignedUrls(vehicle);

      // Fetch dynamic historical logs from DB
      const dbFuelLogs = await FuelLog.find({ vehicleId: id }).sort({ fuelDate: -1 }).limit(10);
      const mappedFuelLogs = [];
      for (const f of dbFuelLogs) {
        const photoUrl = f.odoPhotoUrl ? await getSignedFileUrl(f.odoPhotoUrl) : undefined;
        mappedFuelLogs.push({
          id: f.id || (f as any)._id,
          date: f.fuelDate,
          gallons: f.liters,
          cost: f.totalCost,
          odometer: f.odoReading,
          station: f.fuelStation || 'N/A',
          isVerified: f.isOdoPhotoVerified,
          photoUrl,
        });
      }

      const serviceHistory = [
        {
          id: 'SRV-001',
          date: new Date(Date.now() - 30 * 24 * 3600 * 1000),
          type: 'Scheduled Oil Change',
          odometer: vehicle.lastServiceOdometer || 12000,
          cost: 150.00,
          status: 'Completed',
          technician: 'Marcus Vance',
          notes: 'Full synthetic oil filter replaced, tire rotations checked.'
        },
        {
          id: 'SRV-002',
          date: new Date(Date.now() - 90 * 24 * 3600 * 1000),
          type: 'Brake Pad Replacement',
          odometer: Math.max(0, (vehicle.lastServiceOdometer || 12000) - 8000),
          cost: 450.00,
          status: 'Completed',
          technician: 'Marcus Vance',
          notes: 'Front and rear ceramic brake pads replaced. Calipers inspected.'
        }
      ];

      const expenses = [
        { id: 'EXP-001', date: new Date(), category: 'Tolls', amount: 45.00, description: 'EZ-Pass Toll Refill' },
        { id: 'EXP-002', date: new Date(Date.now() - 15 * 24 * 3600 * 1000), category: 'Cleaning', amount: 30.00, description: 'Deep truck cabin wash' }
      ];

      res.status(200).json({
        vehicle: vehicleWithSignedUrls,
        serviceHistory,
        fuelLogs: mappedFuelLogs.length > 0 ? mappedFuelLogs : [
          {
            id: 'FUEL-MOCK',
            date: new Date(Date.now() - 2 * 24 * 3600 * 1000),
            gallons: 65,
            cost: 220.00,
            odometer: vehicle.lastFuelOdometer || 15600,
            station: 'Shell Plaza TX',
            isVerified: true
          }
        ],
        expenses,
      });
    } catch (err) {
      next(err);
    }
  }
);

app.put(
  '/api/vehicles/:id',
  authenticate,
  authorize(UserRole.OWNER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { brand, model, year, engineNo, chassisNo, fuelType, currentOdometer, lastServiceOdometer, lastFuelOdometer, assignedDriver, assignedHelper, gpsDeviceId } = req.body;

      const vehicle = await Vehicle.findOne({ _id: id, ownerCompanyId: req.user?.companyId });
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle profile not found.' });
      }

      if (brand) vehicle.brand = brand;
      if (model) vehicle.model = model;
      if (year) vehicle.year = year;
      if (engineNo) vehicle.engineNo = engineNo;
      if (chassisNo) vehicle.chassisNo = chassisNo;
      if (fuelType) vehicle.fuelType = fuelType;
      if (currentOdometer !== undefined) vehicle.currentOdometer = currentOdometer;
      if (lastServiceOdometer !== undefined) vehicle.lastServiceOdometer = lastServiceOdometer;
      if (lastFuelOdometer !== undefined) vehicle.lastFuelOdometer = lastFuelOdometer;
      if (gpsDeviceId !== undefined) vehicle.gpsDeviceId = gpsDeviceId || undefined;

      if (assignedDriver !== undefined) {
        const oldDriver = vehicle.assignedDriver;
        vehicle.assignedDriver = assignedDriver || undefined;
        if (oldDriver && oldDriver !== assignedDriver) {
          await User.findByIdAndUpdate(oldDriver, { $unset: { assignedVehicleId: "" } });
        }
        if (assignedDriver) {
          await User.findByIdAndUpdate(assignedDriver, { assignedVehicleId: vehicle._id });
        }
      }

      if (assignedHelper !== undefined) {
        const oldHelper = vehicle.assignedHelper;
        vehicle.assignedHelper = assignedHelper || undefined;
        if (oldHelper && oldHelper !== assignedHelper) {
          await User.findByIdAndUpdate(oldHelper, { $unset: { assignedVehicleId: "" } });
        }
        if (assignedHelper) {
          await User.findByIdAndUpdate(assignedHelper, { assignedVehicleId: vehicle._id });
        }
      }

      await vehicle.save();
      res.status(200).json({ message: 'Vehicle updated successfully.', vehicle });
    } catch (err) {
      next(err);
    }
  }
);

app.post(
  '/api/vehicles/:id/documents',
  authenticate,
  authorize(UserRole.OWNER),
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { type, issueDate, expiryDate } = req.body;

      if (!req.file) {
        return res.status(400).json({ message: 'Document file is required.' });
      }

      if (!type || !issueDate || !expiryDate) {
        return res.status(400).json({ message: 'Document type, issue date, and expiry date are required.' });
      }

      const vehicle = await Vehicle.findOne({ _id: id, ownerCompanyId: req.user?.companyId });
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle profile not found.' });
      }

      const scanResult = await scanFile(req.file.buffer, req.file.originalname);
      if (!scanResult.isClean) {
        return res.status(400).json({
          message: `File security check failed: ${scanResult.threatDetails || 'Malware detected.'}`,
          securityRisk: true,
        });
      }

      const fileKey = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);

      const docEntry = {
        type,
        documentUrl: fileKey,
        issueDate: new Date(issueDate),
        expiryDate: new Date(expiryDate),
        isVerified: false,
      };

      vehicle.documents.push(docEntry);
      await vehicle.save();

      const updatedVehicle = await populateVehicleSignedUrls(vehicle);

      res.status(201).json({
        message: 'Document successfully scanned, verified clean, and vaulted.',
        vehicle: updatedVehicle,
      });
    } catch (err: any) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File is too large. Maximum size allowed is 10MB.' });
      }
      next(err);
    }
  }
);

app.delete(
  '/api/vehicles/:id/documents/:docId',
  authenticate,
  authorize(UserRole.OWNER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id, docId } = req.params;

      const vehicle = await Vehicle.findOne({ _id: id, ownerCompanyId: req.user?.companyId });
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle profile not found.' });
      }

      const docIndex = vehicle.documents.findIndex((d: any) => (d._id || d.id).toString() === docId);
      if (docIndex === -1) {
        return res.status(404).json({ message: 'Document not found in vault.' });
      }

      const doc = vehicle.documents[docIndex];
      await deleteFile(doc.documentUrl);

      vehicle.documents.splice(docIndex, 1);
      await vehicle.save();

      const updatedVehicle = await populateVehicleSignedUrls(vehicle);

      res.status(200).json({
        message: 'Document deleted successfully from vault.',
        vehicle: updatedVehicle,
      });
    } catch (err) {
      next(err);
    }
  }
);

app.post(
  '/api/vehicles/trigger-expiry-check',
  authenticate,
  authorize(UserRole.OWNER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await runExpiryChecks();
      res.status(200).json({ message: 'Expiry scanning triggered successfully. Check console logs for alerts.' });
    } catch (err) {
      next(err);
    }
  }
);

// --- VEHICLE GPS TRACKING ENDPOINTS ---

app.post(
  '/api/tracking/webhook',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const gpsDeviceId = req.body.gpsDeviceId || req.body.device?.uniqueId;
      const lat = req.body.lat !== undefined ? req.body.lat : req.body.position?.latitude;
      const lng = req.body.lng !== undefined ? req.body.lng : req.body.position?.longitude;
      const speed = req.body.speed !== undefined ? req.body.speed : req.body.position?.speed;
      const course = req.body.course !== undefined ? req.body.course : req.body.position?.course;
      const timestamp = req.body.timestamp 
        ? new Date(req.body.timestamp) 
        : (req.body.position?.deviceTime ? new Date(req.body.position.deviceTime) : new Date());

      if (!gpsDeviceId || lat === undefined || lng === undefined) {
        return res.status(400).json({ message: 'Missing required parameters: gpsDeviceId, lat, and lng are required.' });
      }

      const vehicle = await Vehicle.findOne({ gpsDeviceId });
      if (!vehicle) {
        return res.status(404).json({ message: `Vehicle not found with GPS device ID: ${gpsDeviceId}` });
      }

      vehicle.currentLocation = {
        lat,
        lng,
        speed: speed || 0,
        course: course || 0,
        lastUpdate: timestamp,
      };
      await vehicle.save();

      const log = new LocationLog({
        vehicleId: vehicle._id,
        lat,
        lng,
        speed: speed || 0,
        course: course || 0,
        timestamp,
      });
      await log.save();

      io.emit(SocketEvent.LOCATION_UPDATE, {
        vehicleId: vehicle._id,
        regNumber: vehicle.regNumber,
        lat,
        lng,
        speed: speed || 0,
        course: course || 0,
        lastUpdate: timestamp,
      });

      console.log(`[GPS Webhook] Tracked vehicle ${vehicle.regNumber} (${gpsDeviceId}): Lat ${lat}, Lng ${lng}`);
      res.status(200).json({ message: 'GPS tracking data processed successfully.' });
    } catch (err) {
      next(err);
    }
  }
);

app.get(
  '/api/vehicles/:id/tracking-history',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { startDate, endDate } = req.query;

      const vehicle = await Vehicle.findOne({ _id: id, ownerCompanyId: req.user?.companyId });
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle profile not found.' });
      }

      const filter: any = { vehicleId: id };
      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) filter.timestamp.$gte = new Date(startDate as string);
        if (endDate) filter.timestamp.$lte = new Date(endDate as string);
      }

      const logs = await LocationLog.find(filter).sort({ timestamp: 1 }).limit(1000);
      res.status(200).json(logs);
    } catch (err) {
      next(err);
    }
  }
);

// --- FUEL LOG TRACKER API ENDPOINTS ---

app.post(
  '/api/fuel-logs',
  authenticate,
  upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vehicleId, fuelDate, odoReading, liters, pricePerLiter, totalCost, fuelStation } = req.body;

      if (!vehicleId || !odoReading || !liters || !pricePerLiter || !totalCost) {
        return res.status(400).json({ message: 'Vehicle identity, odometer, liters, price, and total cost are required.' });
      }

      const vehicle = await Vehicle.findOne({ _id: vehicleId, ownerCompanyId: req.user?.companyId });
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle profile not found.' });
      }

      const previousOdo = vehicle.lastFuelOdometer || vehicle.currentOdometer || 0;
      const numOdoReading = Number(odoReading);
      const numLiters = Number(liters);

      let warningAlert = undefined;
      if (numOdoReading < previousOdo) {
        warningAlert = `Warning: Current odometer reading (${numOdoReading} km) is less than the previous reading (${previousOdo} km).`;
        console.warn(`[Fuel Log] ${warningAlert}`);
      }

      let odoPhotoUrl = undefined;
      if (req.file) {
        const scanResult = await scanFile(req.file.buffer, req.file.originalname);
        if (!scanResult.isClean) {
          return res.status(400).json({ message: `Security threat found in photo: ${scanResult.threatDetails}` });
        }
        odoPhotoUrl = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);
      }

      const distance = numOdoReading - previousOdo;
      const mileageCalculated = distance > 0 ? Number((distance / numLiters).toFixed(2)) : 0;

      const fuelLog = new FuelLog({
        vehicleId,
        driverId: req.user?.userId,
        companyId: req.user?.companyId,
        fuelDate: fuelDate ? new Date(fuelDate) : new Date(),
        odoReading: numOdoReading,
        liters: numLiters,
        pricePerLiter: Number(pricePerLiter),
        totalCost: Number(totalCost),
        fuelStation,
        previousOdo,
        mileageCalculated,
        isOdoPhotoVerified: false,
        odoPhotoUrl,
      });

      await fuelLog.save();

      vehicle.currentOdometer = numOdoReading;
      vehicle.lastFuelOdometer = numOdoReading;
      await vehicle.save();

      // AUTO-CREATE EXPENSE RECORD FOR REFUEL (FR-EXP-04)
      const refuelExpense = new Expense({
        vehicleId,
        companyId: req.user?.companyId,
        category: ExpenseCategory.FUEL,
        amount: Number(totalCost),
        date: fuelDate ? new Date(fuelDate) : new Date(),
        odoReading: numOdoReading,
        recordedBy: req.user?.userId,
        notes: `Odometer photo-logged fuel refill at ${fuelStation || 'N/A'}. volume: ${numLiters}L.`,
      });
      await refuelExpense.save();

      res.status(201).json({
        message: 'Fuel entry logged and expense ledger updated successfully.',
        warning: warningAlert,
        fuelLog,
      });
    } catch (err) {
      next(err);
    }
  }
);

app.get(
  '/api/fuel-logs',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vehicleId, month, year } = req.query;
      const query: any = { companyId: req.user?.companyId };

      if (vehicleId) {
        query.vehicleId = vehicleId;
      }

      if (month || year) {
        const queryYear = year ? Number(year) : new Date().getFullYear();
        const startMonth = month ? Number(month) - 1 : 0;
        const endMonth = month ? Number(month) : 12;

        const startDate = new Date(queryYear, startMonth, 1);
        const endDate = new Date(queryYear, endMonth, 0, 23, 59, 59, 999);
        
        query.fuelDate = { $gte: startDate, $lte: endDate };
      }

      const logs = await FuelLog.find(query)
        .populate('vehicleId')
        .populate('driverId')
        .sort({ fuelDate: -1 });

      const mappedLogs = [];
      for (const log of logs) {
        const signedUrl = log.odoPhotoUrl ? await getSignedFileUrl(log.odoPhotoUrl) : undefined;
        const logObj = log.toJSON();
        if (signedUrl) {
          logObj.odoPhotoUrl = signedUrl;
        }
        mappedLogs.push(logObj);
      }

      res.status(200).json({ fuelLogs: mappedLogs });
    } catch (err) {
      next(err);
    }
  }
);

app.get(
  '/api/fuel-logs/stats',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vehicleId, month, year } = req.query;
      const query: any = { companyId: req.user?.companyId };

      if (vehicleId) {
        query.vehicleId = vehicleId;
      }

      if (month || year) {
        const queryYear = year ? Number(year) : new Date().getFullYear();
        const startMonth = month ? Number(month) - 1 : 0;
        const endMonth = month ? Number(month) : 12;

        const startDate = new Date(queryYear, startMonth, 1);
        const endDate = new Date(queryYear, endMonth, 0, 23, 59, 59, 999);
        query.fuelDate = { $gte: startDate, $lte: endDate };
      }

      const logs = await FuelLog.find(query).populate('vehicleId');

      let totalCost = 0;
      let totalLiters = 0;
      let totalMileage = 0;
      let logsWithMileage = 0;

      const vehicleEfficiency: { [key: string]: { regNumber: string, sumMileage: number, count: number } } = {};

      for (const log of logs) {
        totalCost += log.totalCost;
        totalLiters += log.liters;

        if (log.mileageCalculated > 0) {
          totalMileage += log.mileageCalculated;
          logsWithMileage++;

          const v = log.vehicleId as any;
          if (v) {
            if (!vehicleEfficiency[v._id]) {
              vehicleEfficiency[v._id] = { regNumber: v.regNumber, sumMileage: 0, count: 0 };
            }
            vehicleEfficiency[v._id].sumMileage += log.mileageCalculated;
            vehicleEfficiency[v._id].count++;
          }
        }
      }

      const averagePrice = totalLiters > 0 ? Number((totalCost / totalLiters).toFixed(2)) : 0;
      const averageEfficiency = logsWithMileage > 0 ? Number((totalMileage / logsWithMileage).toFixed(2)) : 0;

      const lowMileageAlerts = [];
      for (const key of Object.keys(vehicleEfficiency)) {
        const avg = vehicleEfficiency[key].sumMileage / vehicleEfficiency[key].count;
        if (avg < 5) {
          lowMileageAlerts.push({
            vehicleId: key,
            regNumber: vehicleEfficiency[key].regNumber,
            averageEfficiency: Number(avg.toFixed(2)),
            message: `Low Efficiency Alert: Vehicle ${vehicleEfficiency[key].regNumber} averages ${avg.toFixed(2)} km/L (threshold: 5.00 km/L)`,
          });
        }
      }

      res.status(200).json({
        totalCost,
        totalLiters,
        averagePrice,
        averageEfficiency,
        lowMileageAlerts,
      });
    } catch (err) {
      next(err);
    }
  }
);

app.get(
  '/api/fuel-logs/mileage-trend',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vehicleId, year } = req.query;
      const queryYear = year ? Number(year) : new Date().getFullYear();

      const query: any = {
        companyId: req.user?.companyId,
        fuelDate: {
          $gte: new Date(queryYear, 0, 1),
          $lte: new Date(queryYear, 11, 31, 23, 59, 59, 999),
        },
      };

      if (vehicleId) {
        query.vehicleId = vehicleId;
      }

      const logs = await FuelLog.find(query);

      const monthsData = Array.from({ length: 12 }, (_, i) => ({
        month: new Date(queryYear, i).toLocaleString('default', { month: 'short' }),
        cost: 0,
        liters: 0,
        totalEfficiency: 0,
        count: 0,
      }));

      for (const log of logs) {
        const monthIndex = new Date(log.fuelDate).getMonth();
        monthsData[monthIndex].cost += log.totalCost;
        monthsData[monthIndex].liters += log.liters;
        if (log.mileageCalculated > 0) {
          monthsData[monthIndex].totalEfficiency += log.mileageCalculated;
          monthsData[monthIndex].count++;
        }
      }

      const chartData = monthsData.map((m) => ({
        name: m.month,
        fuelCost: Number(m.cost.toFixed(2)),
        fuelLiters: Number(m.liters.toFixed(2)),
        mileage: m.count > 0 ? Number((m.totalEfficiency / m.count).toFixed(2)) : 0,
      }));

      res.status(200).json({ trend: chartData });
    } catch (err) {
      next(err);
    }
  }
);

app.post(
  '/api/fuel-logs/:id/verify-odo',
  authenticate,
  authorize(UserRole.OWNER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const log = await FuelLog.findOne({ _id: id, companyId: req.user?.companyId });

      if (!log) {
        return res.status(404).json({ message: 'Fuel log record not found.' });
      }

      log.isOdoPhotoVerified = true;
      await log.save();

      res.status(200).json({ message: 'Odometer reading photo verified successfully.', log });
    } catch (err) {
      next(err);
    }
  }
);

// --- MAINTENANCE TICKETS API ENDPOINTS (FR-TICKET-01 to FR-TICKET-08) ---

app.post(
  '/api/tickets',
  authenticate,
  ticketUploadFields,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vehicleId, type, description, odoAtReport } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } || {};

      if (!vehicleId || !description || !odoAtReport) {
        return res.status(400).json({ message: 'Vehicle, issue description, and odometer reading are required.' });
      }

      const vehicle = await Vehicle.findOne({ _id: vehicleId, ownerCompanyId: req.user?.companyId });
      if (!vehicle) {
        return res.status(404).json({ message: 'Vehicle profile not found.' });
      }

      // Upload and Scan Images (max 3)
      const imageUrls: string[] = [];
      const imageFiles = files['images'] || [];
      for (const file of imageFiles) {
        const scanResult = await scanFile(file.buffer, file.originalname);
        if (!scanResult.isClean) {
          return res.status(400).json({ message: `Security threat found in image file: ${scanResult.threatDetails}` });
        }
        const key = await uploadFile(file.buffer, file.originalname, file.mimetype);
        imageUrls.push(key);
      }

      // Upload and Scan Voice Note (max 1)
      let voiceNoteUrl = undefined;
      const voiceFiles = files['voiceNote'] || [];
      if (voiceFiles.length > 0) {
        const file = voiceFiles[0];
        const scanResult = await scanFile(file.buffer, file.originalname);
        if (!scanResult.isClean) {
          return res.status(400).json({ message: `Security threat found in voice recording: ${scanResult.threatDetails}` });
        }
        voiceNoteUrl = await uploadFile(file.buffer, file.originalname, file.mimetype);
      }

      const ticket = new Ticket({
        companyId: req.user?.companyId,
        vehicleId,
        reportedById: req.user?.userId,
        reportedByRole: req.user?.role,
        type: type || TicketType.OTHER,
        status: TicketStatus.OPEN,
        description,
        images: imageUrls,
        voiceNoteUrl,
        odoAtReport: Number(odoAtReport),
        activityLog: [
          {
            userId: req.user?.userId,
            action: 'Created',
            details: `Ticket registered under category: ${type || TicketType.OTHER}`,
          }
        ],
      });

      await ticket.save();

      // Broadcast Socket notification to Owner
      io.emit(SocketEvent.NOTIFICATION, {
        type: 'NEW_TICKET',
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        regNumber: vehicle.regNumber,
        message: `New ticket ${ticket.ticketNumber} reported for vehicle ${vehicle.regNumber} (${type || TicketType.OTHER})`,
      });

      // Notify Company Owner via SMS
      const owner = await User.findOne({ companyId: req.user?.companyId, role: UserRole.OWNER });
      if (owner && owner.phone) {
        await sendSMS(owner.phone, `Alert: Vehicle ${vehicle.regNumber} reported a new ticket ${ticket.ticketNumber} (${type || TicketType.OTHER}).`);
      }

      res.status(201).json({ message: 'Ticket registered and scanned successfully.', ticket });
    } catch (err) {
      next(err);
    }
  }
);

app.get(
  '/api/tickets',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status, vehicleId, type, startDate, endDate } = req.query;
      const query: any = { companyId: req.user?.companyId };

      if (status) query.status = status;
      if (vehicleId) query.vehicleId = vehicleId;
      if (type) query.type = type;

      if (startDate || endDate) {
        const dateRange: any = {};
        if (startDate) dateRange.$gte = new Date(startDate as string);
        if (endDate) dateRange.$lte = new Date(endDate as string);
        query.createdAt = dateRange;
      }

      const tickets = await Ticket.find(query)
        .populate('vehicleId')
        .populate('reportedById')
        .populate('assignedToId')
        .sort({ createdAt: -1 });

      const mappedTickets = [];
      for (const t of tickets) {
        mappedTickets.push(await populateTicketSignedUrls(t));
      }

      res.status(200).json({ tickets: mappedTickets });
    } catch (err) {
      next(err);
    }
  }
);

app.get(
  '/api/tickets/kanban',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = { companyId: req.user?.companyId };
      const tickets = await Ticket.find(query)
        .populate('vehicleId')
        .populate('reportedById')
        .populate('assignedToId')
        .sort({ updatedAt: -1 });

      // Group tickets by status
      const kanbanColumns: { [key: string]: any[] } = {
        [TicketStatus.OPEN]: [],
        [TicketStatus.ASSIGNED]: [],
        [TicketStatus.IN_PROGRESS]: [],
        [TicketStatus.SOLVED_PENDING_PAYMENT]: [],
        [TicketStatus.SOLVED]: [],
        [TicketStatus.CLOSED]: [],
      };

      for (const t of tickets) {
        const signedTicket = await populateTicketSignedUrls(t);
        if (kanbanColumns[t.status]) {
          kanbanColumns[t.status].push(signedTicket);
        } else {
          kanbanColumns[TicketStatus.OPEN].push(signedTicket);
        }
      }

      res.status(200).json({ kanban: kanbanColumns });
    } catch (err) {
      next(err);
    }
  }
);

app.get(
  '/api/tickets/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const ticket = await Ticket.findOne({ _id: id, companyId: req.user?.companyId })
        .populate('vehicleId')
        .populate('reportedById')
        .populate('assignedToId')
        .populate('activityLog.userId');

      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found.' });
      }

      const signedTicket = await populateTicketSignedUrls(ticket);
      res.status(200).json({ ticket: signedTicket });
    } catch (err) {
      next(err);
    }
  }
);

app.put(
  '/api/tickets/:id/assign',
  authenticate,
  authorize(UserRole.OWNER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { assignedToId } = req.body;

      if (!assignedToId) {
        return res.status(400).json({ message: 'Technician assignment identity is required.' });
      }

      const ticket = await Ticket.findOne({ _id: id, companyId: req.user?.companyId });
      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found.' });
      }

      const techUser = await User.findOne({ _id: assignedToId, companyId: req.user?.companyId, role: UserRole.TECHNICIAN });
      if (!techUser) {
        return res.status(404).json({ message: 'Technician not found in company.' });
      }

      const oldStatus = ticket.status;
      ticket.assignedToId = assignedToId;
      
      if (ticket.status === TicketStatus.OPEN) {
        ticket.status = TicketStatus.ASSIGNED;
      }

      ticket.activityLog.push({
        userId: req.user?.userId || '',
        action: 'Assigned',
        timestamp: new Date(),
        details: `Ticket assigned to technician ${techUser.name} (Status shifted: ${oldStatus} -> ${ticket.status})`,
      });

      await ticket.save();

      io.emit(SocketEvent.NOTIFICATION, {
        type: 'TICKET_ASSIGNED',
        technicianId: assignedToId,
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        message: `You have been assigned maintenance ticket ${ticket.ticketNumber}.`,
      });

      if (techUser.phone) {
        await sendSMS(techUser.phone, `Alert: You have been assigned ticket ${ticket.ticketNumber} by dispatch. Open your app to log solution.`);
      }

      res.status(200).json({ message: 'Technician successfully assigned.', ticket });
    } catch (err) {
      next(err);
    }
  }
);

app.put(
  '/api/tickets/:id/solve',
  authenticate,
  authorize(UserRole.TECHNICIAN, UserRole.OWNER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { description, partsUsed, laborCost } = req.body;

      if (!description) {
        return res.status(400).json({ message: 'Solution details description is required.' });
      }

      const ticket = await Ticket.findOne({ _id: id, companyId: req.user?.companyId })
        .populate('vehicleId')
        .populate('reportedById');

      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found.' });
      }

      const parts = partsUsed || [];
      const partsCost = parts.reduce((acc: number, val: any) => acc + (Number(val.quantity) * Number(val.price)), 0);
      const labor = Number(laborCost || 0);
      const totalCost = partsCost + labor;

      ticket.solution = {
        description,
        partsUsed: parts,
        laborCost: labor,
        totalCost,
      };

      const oldStatus = ticket.status;
      ticket.status = TicketStatus.SOLVED_PENDING_PAYMENT;
      ticket.resolvedAt = new Date();

      ticket.activityLog.push({
        userId: req.user?.userId || '',
        action: 'Solved',
        timestamp: new Date(),
        details: `Solution logged by technician. Labor: $${labor}, Parts: $${partsCost}. Status: ${oldStatus} -> ${ticket.status}`,
      });

      await ticket.save();

      const company = await Company.findById(ticket.companyId);
      const customerName = company ? company.name : 'FleetMaster Client';

      const invoiceItems = [
        { description: 'Labor / Mechanical Services', quantity: 1, unitPrice: labor, total: labor },
        ...parts.map((p: any) => ({
          description: `Part: ${p.name}`,
          quantity: Number(p.quantity),
          unitPrice: Number(p.price),
          total: Number(p.quantity) * Number(p.price),
        })),
      ];

      const subTotal = totalCost;
      const taxAmount = Number((subTotal * 0.05).toFixed(2));
      const totalAmount = subTotal + taxAmount;

      await Invoice.deleteOne({ ticketId: ticket._id });

      const invoice = new Invoice({
        ticketId: ticket._id,
        companyId: ticket.companyId,
        vehicleId: (ticket.vehicleId as any)._id || ticket.vehicleId,
        customerName,
        items: invoiceItems,
        subTotal,
        taxAmount,
        totalAmount,
        status: 'Pending',
      });

      await invoice.save();

      io.emit(SocketEvent.NOTIFICATION, {
        type: 'TICKET_SOLVED',
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        invoiceId: invoice.id,
        message: `Ticket ${ticket.ticketNumber} resolved by technician. Invoice ${invoice.invoiceNumber} created.`,
      });

      const owner = await User.findOne({ companyId: req.user?.companyId, role: UserRole.OWNER });
      if (owner && owner.phone) {
        await sendSMS(owner.phone, `Alert: Ticket ${ticket.ticketNumber} resolved. Invoice ${invoice.invoiceNumber} ($${totalAmount}) is pending payment.`);
      }

      res.status(200).json({ message: 'Solution logged. Invoice generated.', ticket, invoice });
    } catch (err) {
      next(err);
    }
  }
);

app.put(
  '/api/tickets/:id/close',
  authenticate,
  authorize(UserRole.OWNER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const ticket = await Ticket.findOne({ _id: id, companyId: req.user?.companyId })
        .populate('vehicleId')
        .populate('reportedById');

      if (!ticket) {
        return res.status(404).json({ message: 'Ticket not found.' });
      }

      const oldStatus = ticket.status;
      ticket.status = TicketStatus.CLOSED;
      ticket.closedAt = new Date();

      ticket.activityLog.push({
        userId: req.user?.userId || '',
        action: 'Closed',
        timestamp: new Date(),
        details: `Ticket closed. Payment received. Status: ${oldStatus} -> ${ticket.status}`,
      });

      await ticket.save();

      await Invoice.findOneAndUpdate({ ticketId: ticket._id }, { status: 'Paid' });

      if (ticket.vehicleId) {
        const vehicle = await Vehicle.findById((ticket.vehicleId as any)._id || ticket.vehicleId);
        if (vehicle) {
          vehicle.lastServiceOdometer = ticket.odoAtReport;
          await vehicle.save();
        }
      }

      const reporter = await User.findById(ticket.reportedById);
      if (reporter) {
        io.emit(SocketEvent.NOTIFICATION, {
          type: 'TICKET_CLOSED',
          reporterId: reporter._id,
          ticketNumber: ticket.ticketNumber,
          message: `Your reported ticket ${ticket.ticketNumber} has been closed. Thank you!`,
        });

        if (reporter.phone) {
          await sendSMS(reporter.phone, `Alert: Maintenance ticket ${ticket.ticketNumber} is completed & closed. Odometer records synced.`);
        }
      }

      res.status(200).json({ message: 'Ticket closed and odometer logs reset.', ticket });
    } catch (err) {
      next(err);
    }
  }
);

// --- INVOICING API ENDPOINTS ---

app.get(
  '/api/invoices/:id',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const invoice = await Invoice.findOne({ _id: id, companyId: req.user?.companyId })
        .populate('vehicleId')
        .populate('ticketId');

      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found.' });
      }

      res.status(200).json({ invoice });
    } catch (err) {
      next(err);
    }
  }
);

app.get(
  '/api/invoices/ticket/:ticketId',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { ticketId } = req.params;
      const invoice = await Invoice.findOne({ ticketId, companyId: req.user?.companyId })
        .populate('vehicleId');

      if (!invoice) {
        return res.status(404).json({ message: 'No invoice registered for this ticket.' });
      }

      res.status(200).json({ invoice });
    } catch (err) {
      next(err);
    }
  }
);

app.get(
  '/api/invoices/:id/pdf',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const invoice: any = await Invoice.findOne({ _id: id, companyId: req.user?.companyId })
        .populate('vehicleId')
        .populate('ticketId');

      if (!invoice) {
        return res.status(404).send('Invoice not found.');
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 40px; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #ddd; padding-bottom: 20px; }
            .title { font-size: 28px; font-weight: bold; color: #1e1b4b; }
            .invoice-details { text-align: right; font-size: 14px; color: #555; }
            .parties { margin: 30px 0; display: flex; justify-content: space-between; font-size: 14px; }
            .bill-to { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th { background-color: #f3f4f6; padding: 12px; font-size: 13px; text-transform: uppercase; text-align: left; border-bottom: 2px solid #e5e7eb; }
            td { padding: 12px; font-size: 13px; border-bottom: 1px solid #e5e7eb; }
            .amount-column { text-align: right; }
            .totals { margin-top: 30px; text-align: right; font-size: 14px; }
            .totals div { margin-bottom: 6px; }
            .grand-total { font-size: 18px; font-weight: bold; color: #1e1b4b; }
            .footer { margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; text-align: center; font-size: 11px; color: #888; }
            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-30deg);
              font-size: 130px;
              font-weight: 900;
              color: rgba(16, 185, 129, 0.12);
              text-transform: uppercase;
              border: 15px solid rgba(16, 185, 129, 0.12);
              padding: 10px 30px;
              border-radius: 20px;
              pointer-events: none;
              letter-spacing: 10px;
            }
            .watermark.pending {
              color: rgba(245, 158, 11, 0.12);
              border-color: rgba(245, 158, 11, 0.12);
            }
            @media print {
              .print-btn { display: none; }
            }
          </style>
        </head>
        <body style="position: relative; min-height: 100vh;">
          <div class="watermark ${invoice.status === 'Paid' ? '' : 'pending'}">${invoice.status}</div>
          <div style="text-align: right; margin-bottom: 20px;">
            <button class="print-btn" onclick="window.print()" style="background-color: #4f46e5; color: white; border: none; padding: 10px 20px; font-size: 14px; font-weight: bold; border-radius: 6px; cursor: pointer;">Print / Download PDF</button>
          </div>
          <div class="header">
            <div>
              <div class="title">FleetMaster Pro</div>
              <div style="font-size: 12px; color: #888; margin-top: 4px;">Premium Maintenance billing</div>
            </div>
            <div class="invoice-details">
              <div style="font-size: 18px; font-weight: bold; color: #333; margin-bottom: 4px;">INVOICE</div>
              <div>No: ${invoice.invoiceNumber}</div>
              <div>Issued: ${new Date(invoice.issuedDate).toLocaleDateString()}</div>
              <div>Due: ${new Date(invoice.dueDate).toLocaleDateString()}</div>
            </div>
          </div>
          <div class="parties">
            <div>
              <div class="bill-to">Customer:</div>
              <div>${invoice.customerName}</div>
              <div style="margin-top: 10px; font-weight: bold;">Vehicle Specs:</div>
              <div>Plate: ${invoice.vehicleId?.regNumber || 'N/A'}</div>
              <div>Model: ${invoice.vehicleId?.brand || ''} ${invoice.vehicleId?.model || ''}</div>
            </div>
            <div style="text-align: right;">
              <div class="bill-to">Ticket reference:</div>
              <div>${invoice.ticketId?.ticketNumber || 'N/A'}</div>
              <div>Type: ${invoice.ticketId?.type || 'N/A'}</div>
              <div style="margin-top: 10px; font-weight: bold;">Payment status:</div>
              <div style="color: ${invoice.status === 'Paid' ? '#10b981' : '#f59e0b'}; font-weight: bold; font-size: 16px;">${invoice.status}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th class="amount-column">Unit Price</th>
                <th class="amount-column">Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map((item: any) => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td class="amount-column">$${item.unitPrice.toFixed(2)}</td>
                  <td class="amount-column">$${item.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="totals">
            <div>Subtotal: $${invoice.subTotal.toFixed(2)}</div>
            <div>Tax (5%): $${invoice.taxAmount.toFixed(2)}</div>
            <div class="grand-total">Total Amount: $${invoice.totalAmount.toFixed(2)}</div>
          </div>
          <div class="footer">
            Thank you for your business. For billing queries support, call FleetMaster dispatch.
          </div>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (err) {
      next(err);
    }
  }
);

// --- PAYMENTS & TRANSACTIONS API ENDPOINTS (FR-PAY-01 to FR-PAY-06) ---

app.post(
  '/api/payments',
  authenticate,
  authorize(UserRole.OWNER, UserRole.ACCOUNTANT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { invoiceId, paymentMethod, transactionId, notes } = req.body;

      if (!invoiceId || !paymentMethod) {
        return res.status(400).json({ message: 'Invoice ID and payment method are required.' });
      }

      if ((paymentMethod === PaymentMethod.BKASH || paymentMethod === PaymentMethod.NAGAD) && !transactionId) {
        return res.status(400).json({ message: 'Transaction ID manual code is required for mobile banking.' });
      }

      const invoice = await Invoice.findOne({ _id: invoiceId, companyId: req.user?.companyId });
      if (!invoice) {
        return res.status(404).json({ message: 'Invoice not found.' });
      }

      const ticket = await Ticket.findOne({ _id: invoice.ticketId, companyId: req.user?.companyId })
        .populate('vehicleId');

      if (!ticket) {
        return res.status(404).json({ message: 'Linked maintenance ticket not found.' });
      }

      const existing = await Transaction.findOne({
        invoiceId,
        status: { $in: [TransactionStatus.PENDING, TransactionStatus.COMPLETED, TransactionStatus.VERIFIED] }
      });

      if (existing) {
        return res.status(400).json({ message: `A transaction with status ${existing.status} is already logged for this invoice.` });
      }

      await Transaction.deleteOne({ invoiceId, status: TransactionStatus.REJECTED });

      const isCash = paymentMethod === PaymentMethod.CASH;
      const status = isCash ? TransactionStatus.COMPLETED : TransactionStatus.PENDING;

      const transaction = new Transaction({
        invoiceId,
        ticketId: invoice.ticketId,
        companyId: req.user?.companyId,
        amount: invoice.totalAmount,
        paymentMethod,
        transactionId: isCash ? `CASH-${Date.now()}` : transactionId,
        status,
        notes,
        verifiedBy: isCash ? req.user?.userId : undefined,
        verifiedAt: isCash ? new Date() : undefined,
      });

      await transaction.save();

      if (isCash) {
        // Immediate completion: update invoice, ticket, and odometer
        invoice.status = 'Paid';
        await invoice.save();

        ticket.status = TicketStatus.CLOSED;
        ticket.closedAt = new Date();
        ticket.activityLog.push({
          userId: req.user?.userId || '',
          action: 'Closed',
          timestamp: new Date(),
          details: `Ticket closed. Cash payment received: $${invoice.totalAmount.toFixed(2)}.`,
        });
        await ticket.save();

        if (ticket.vehicleId) {
          const vehicle = await Vehicle.findById((ticket.vehicleId as any)._id || ticket.vehicleId);
          if (vehicle) {
            vehicle.lastServiceOdometer = ticket.odoAtReport;
            await vehicle.save();
          }
        }

        // AUTO-CREATE SERVICE EXPENSE (FR-EXP-04)
        const serviceExpense = new Expense({
          vehicleId: (ticket.vehicleId as any)._id || ticket.vehicleId,
          companyId: ticket.companyId,
          category: ExpenseCategory.SERVICE,
          amount: ticket.solution ? ticket.solution.totalCost : invoice.totalAmount,
          date: new Date(),
          odoReading: ticket.odoAtReport,
          recordedBy: req.user?.userId,
          ticketId: ticket._id,
          notes: `Automated Service expense log created from resolved Ticket: ${ticket.ticketNumber}.`,
        });
        await serviceExpense.save();

        io.emit(SocketEvent.NOTIFICATION, {
          type: 'TICKET_CLOSED',
          ticketNumber: ticket.ticketNumber,
          message: `Invoice ${invoice.invoiceNumber} paid via Cash. Ticket ${ticket.ticketNumber} closed.`,
        });
      } else {
        io.emit(SocketEvent.NOTIFICATION, {
          type: 'PAYMENT_PENDING',
          invoiceNumber: invoice.invoiceNumber,
          message: `New payment verification requested for Invoice ${invoice.invoiceNumber} via ${paymentMethod} ($${invoice.totalAmount}).`,
        });
      }

      res.status(201).json({ message: isCash ? 'Payment completed.' : 'Payment logged, pending verification.', transaction });
    } catch (err) {
      next(err);
    }
  }
);

app.get(
  '/api/payments/pending',
  authenticate,
  authorize(UserRole.OWNER, UserRole.ACCOUNTANT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pending = await Transaction.find({
        companyId: req.user?.companyId,
        status: TransactionStatus.PENDING,
      })
      .populate({
        path: 'invoiceId',
        populate: { path: 'vehicleId' }
      })
      .populate('ticketId')
      .sort({ createdAt: -1 });

      res.status(200).json({ pending });
    } catch (err) {
      next(err);
    }
  }
);

app.put(
  '/api/payments/:id/verify',
  authenticate,
  authorize(UserRole.OWNER, UserRole.ACCOUNTANT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const transaction = await Transaction.findOne({ _id: id, companyId: req.user?.companyId });

      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found.' });
      }

      if (transaction.status !== TransactionStatus.PENDING) {
        return res.status(400).json({ message: 'Transaction is not in pending state.' });
      }

      transaction.status = TransactionStatus.COMPLETED;
      transaction.verifiedBy = req.user?.userId;
      transaction.verifiedAt = new Date();
      await transaction.save();

      const invoice = await Invoice.findById(transaction.invoiceId);
      if (invoice) {
        invoice.status = 'Paid';
        await invoice.save();
      }

      const ticket = await Ticket.findById(transaction.ticketId);
      if (ticket) {
        ticket.status = TicketStatus.CLOSED;
        ticket.closedAt = new Date();
        ticket.activityLog.push({
          userId: req.user?.userId || '',
          action: 'Closed',
          timestamp: new Date(),
          details: `Ticket closed. Mobile payment verified via ${transaction.paymentMethod} (TrxID: ${transaction.transactionId}).`,
        });
        await ticket.save();

        if (ticket.vehicleId) {
          const vehicle = await Vehicle.findById((ticket.vehicleId as any)._id || ticket.vehicleId);
          if (vehicle) {
            vehicle.lastServiceOdometer = ticket.odoAtReport;
            await vehicle.save();
          }
        }

        // AUTO-CREATE SERVICE EXPENSE (FR-EXP-04)
        const serviceExpense = new Expense({
          vehicleId: (ticket.vehicleId as any)._id || ticket.vehicleId,
          companyId: ticket.companyId,
          category: ExpenseCategory.SERVICE,
          amount: ticket.solution ? ticket.solution.totalCost : transaction.amount,
          date: new Date(),
          odoReading: ticket.odoAtReport,
          recordedBy: req.user?.userId,
          ticketId: ticket._id,
          notes: `Automated Service expense log created from resolved Ticket: ${ticket.ticketNumber} via mobile verification.`,
        });
        await serviceExpense.save();

        io.emit(SocketEvent.NOTIFICATION, {
          type: 'TICKET_CLOSED',
          ticketNumber: ticket.ticketNumber,
          message: `Invoice ${invoice?.invoiceNumber} payment verified. Ticket ${ticket.ticketNumber} closed.`,
        });
      }

      res.status(200).json({ message: 'Payment successfully verified and ticket closed.', transaction });
    } catch (err) {
      next(err);
    }
  }
);

app.put(
  '/api/payments/:id/reject',
  authenticate,
  authorize(UserRole.OWNER, UserRole.ACCOUNTANT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const transaction = await Transaction.findOne({ _id: id, companyId: req.user?.companyId });

      if (!transaction) {
        return res.status(404).json({ message: 'Transaction not found.' });
      }

      if (transaction.status !== TransactionStatus.PENDING) {
        return res.status(400).json({ message: 'Transaction is not in pending state.' });
      }

      transaction.status = TransactionStatus.REJECTED;
      transaction.verifiedBy = req.user?.userId;
      transaction.verifiedAt = new Date();
      transaction.notes = notes || 'Verification details invalid or rejected.';
      await transaction.save();

      const ticket = await Ticket.findById(transaction.ticketId);
      if (ticket) {
        ticket.activityLog.push({
          userId: req.user?.userId || '',
          action: 'Payment Rejected',
          timestamp: new Date(),
          details: `Payment rejection logged for ${transaction.paymentMethod} (TrxID: ${transaction.transactionId}). Note: ${transaction.notes}`,
        });
        await ticket.save();
      }

      res.status(200).json({ message: 'Payment rejected. Maintenance ticket remains in solved status.', transaction });
    } catch (err) {
      next(err);
    }
  }
);

app.get(
  '/api/transactions',
  authenticate,
  authorize(UserRole.OWNER, UserRole.ACCOUNTANT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate, paymentMethod, status } = req.query;
      const query: any = { companyId: req.user?.companyId };

      if (paymentMethod) {
        query.paymentMethod = paymentMethod;
      }
      if (status) {
        query.status = status;
      }

      if (startDate || endDate) {
        const dateRange: any = {};
        if (startDate) dateRange.$gte = new Date(startDate as string);
        if (endDate) dateRange.$lte = new Date(endDate as string);
        query.createdAt = dateRange;
      }

      const history = await Transaction.find(query)
        .populate('invoiceId')
        .populate('ticketId')
        .populate('verifiedBy')
        .sort({ createdAt: -1 });

      res.status(200).json({ transactions: history });
    } catch (err) {
      next(err);
    }
  }
);

app.get(
  '/api/transactions/export',
  authenticate,
  authorize(UserRole.OWNER, UserRole.ACCOUNTANT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { startDate, endDate, paymentMethod, status } = req.query;
      const query: any = { companyId: req.user?.companyId };

      if (paymentMethod) {
        query.paymentMethod = paymentMethod;
      }
      if (status) {
        query.status = status;
      }

      if (startDate || endDate) {
        const dateRange: any = {};
        if (startDate) dateRange.$gte = new Date(startDate as string);
        if (endDate) dateRange.$lte = new Date(endDate as string);
        query.createdAt = dateRange;
      }

      const transactions = await Transaction.find(query)
        .populate('invoiceId')
        .populate('ticketId')
        .populate('verifiedBy')
        .sort({ createdAt: -1 });

      let csvContent = 'Invoice Number,Ticket Number,Amount,Payment Method,Transaction ID,Status,Date,Verified By\n';
      
      for (const t of transactions) {
        const invNum = (t.invoiceId as any)?.invoiceNumber || 'N/A';
        const tixNum = (t.ticketId as any)?.ticketNumber || 'N/A';
        const verName = (t.verifiedBy as any)?.name || 'N/A';
        const dateStr = new Date((t as any).createdAt).toLocaleDateString();

        csvContent += `"${invNum}","${tixNum}",${t.amount},"${t.paymentMethod}","${t.transactionId || ''}","${t.status}","${dateStr}","${verName}"\n`;
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
      res.status(200).send(csvContent);
    } catch (err) {
      next(err);
    }
  }
);

// --- EXPENSES & INCOMES API ENDPOINTS (FR-EXP-01 to FR-EXP-04) ---

app.post(
  '/api/expenses',
  authenticate,
  authorize(UserRole.OWNER, UserRole.ACCOUNTANT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vehicleId, category, amount, date, odoReading, notes } = req.body;

      if (!vehicleId || !category || !amount) {
        return res.status(400).json({ message: 'Vehicle, category, and expense amount are required.' });
      }

      const expense = new Expense({
        vehicleId,
        companyId: req.user?.companyId,
        category,
        amount: Number(amount),
        date: date ? new Date(date) : new Date(),
        odoReading: odoReading ? Number(odoReading) : undefined,
        recordedBy: req.user?.userId,
        notes,
      });

      await expense.save();
      res.status(201).json({ message: 'Expense logged successfully.', expense });
    } catch (err) {
      next(err);
    }
  }
);

app.get(
  '/api/expenses',
  authenticate,
  authorize(UserRole.OWNER, UserRole.ACCOUNTANT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vehicleId, category, startDate, endDate } = req.query;
      const query: any = { companyId: req.user?.companyId };

      if (vehicleId) query.vehicleId = vehicleId;
      if (category) query.category = category;

      if (startDate || endDate) {
        const range: any = {};
        if (startDate) range.$gte = new Date(startDate as string);
        if (endDate) range.$lte = new Date(endDate as string);
        query.date = range;
      }

      const list = await Expense.find(query)
        .populate('vehicleId')
        .populate('recordedBy')
        .sort({ date: -1 });

      res.status(200).json({ expenses: list });
    } catch (err) {
      next(err);
    }
  }
);

app.post(
  '/api/incomes',
  authenticate,
  authorize(UserRole.OWNER, UserRole.ACCOUNTANT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vehicleId, source, amount, date, description } = req.body;

      if (!vehicleId || !source || !amount || !description) {
        return res.status(400).json({ message: 'Vehicle, source, amount, and description are required.' });
      }

      const income = new Income({
        vehicleId,
        companyId: req.user?.companyId,
        source,
        amount: Number(amount),
        date: date ? new Date(date) : new Date(),
        description,
        recordedBy: req.user?.userId,
      });

      await income.save();
      res.status(201).json({ message: 'Income logged successfully.', income });
    } catch (err) {
      next(err);
    }
  }
);

app.get(
  '/api/incomes',
  authenticate,
  authorize(UserRole.OWNER, UserRole.ACCOUNTANT),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vehicleId, startDate, endDate } = req.query;
      const query: any = { companyId: req.user?.companyId };

      if (vehicleId) query.vehicleId = vehicleId;

      if (startDate || endDate) {
        const range: any = {};
        if (startDate) range.$gte = new Date(startDate as string);
        if (endDate) range.$lte = new Date(endDate as string);
        query.date = range;
      }

      const list = await Income.find(query)
        .populate('vehicleId')
        .populate('recordedBy')
        .sort({ date: -1 });

      res.status(200).json({ incomes: list });
    } catch (err) {
      next(err);
    }
  }
);

// --- FINANCIAL REPORTING API ENDPOINTS (FR-RPT-01 to FR-RPT-03) ---

// 39. Dashboard Overview stats aggregation
app.get(
  '/api/reports/dashboard-summary',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const companyId = req.user?.companyId;

      // 1. Active Vehicles count
      const activeVehicles = await Vehicle.countDocuments({ ownerCompanyId: companyId });

      // 2. Open tickets
      const openTickets = await Ticket.countDocuments({
        companyId,
        status: { $in: [TicketStatus.OPEN, TicketStatus.ASSIGNED, TicketStatus.IN_PROGRESS] }
      });

      // 3. This month's fuel costs
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);

      const fuelExpenses = await Expense.find({
        companyId,
        category: ExpenseCategory.FUEL,
        date: { $gte: firstDay, $lte: lastDay }
      });
      const fuelTotalThisMonth = fuelExpenses.reduce((acc, exp) => acc + exp.amount, 0);

      // Previous month fuel for trend comparison
      const prevFirstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const prevLastDay = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
      const prevFuelExpenses = await Expense.find({
        companyId,
        category: ExpenseCategory.FUEL,
        date: { $gte: prevFirstDay, $lte: prevLastDay }
      });
      const fuelTotalPrevMonth = prevFuelExpenses.reduce((acc, exp) => acc + exp.amount, 0);
      const fuelTrendIncrease = fuelTotalPrevMonth > 0 
        ? Number((((fuelTotalThisMonth - fuelTotalPrevMonth) / fuelTotalPrevMonth) * 100).toFixed(1))
        : 0;

      // 4. Profit & Loss Snapshot: aggregates total income vs expenses of all-time or this month
      const totalRevenues = await Income.aggregate([
        { $match: { companyId: new Types.ObjectId(companyId) } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);
      const totalExpenditures = await Expense.aggregate([
        { $match: { companyId: new Types.ObjectId(companyId) } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const revTotal = totalRevenues[0]?.total || 0;
      const expTotal = totalExpenditures[0]?.total || 0;
      const netProfit = revTotal - expTotal;

      // 5. Expiry documents alerts within 7 days
      const sevenDays = new Date();
      sevenDays.setDate(today.getDate() + 7);

      const vehiclesWithExpiring = await Vehicle.find({
        ownerCompanyId: companyId,
        'documents.expiryDate': { $gte: today, $lte: sevenDays },
      });

      const expiringDocsAlerts = [];
      for (const v of vehiclesWithExpiring) {
        for (const doc of v.documents) {
          const exp = new Date(doc.expiryDate);
          if (exp >= today && exp <= sevenDays) {
            const deltaDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 3600 * 24));
            expiringDocsAlerts.push({
              regNumber: v.regNumber,
              docType: doc.type,
              daysLeft: deltaDays,
              expiryDate: doc.expiryDate,
            });
          }
        }
      }

      // Recent Activity timeline (e.g. recent tickets, refueling logs)
      const recentTickets = await Ticket.find({ companyId })
        .populate('vehicleId')
        .sort({ createdAt: -1 })
        .limit(3);

      const mappedActivities = recentTickets.map(t => ({
        timestamp: (t as any).createdAt,
        type: 'maintenance',
        message: `Ticket ${t.ticketNumber} (${t.type}) is ${t.status} for ${(t.vehicleId as any)?.regNumber || 'N/A'}`,
      }));

      res.status(200).json({
        activeVehicles,
        openTickets,
        fuelTotalThisMonth,
        fuelTrendIncrease,
        profitSnapshot: {
          revenues: revTotal,
          expenses: expTotal,
          netProfit,
        },
        expiringDocsAlerts,
        activities: mappedActivities,
      });
    } catch (err) {
      next(err);
    }
  }
);

// 40. Expense category breakdown
app.get(
  '/api/reports/expense-breakdown',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { month, year } = req.query;
      const query: any = { companyId: req.user?.companyId };

      if (month || year) {
        const queryYear = year ? Number(year) : new Date().getFullYear();
        const startMonth = month ? Number(month) - 1 : 0;
        const endMonth = month ? Number(month) : 12;

        query.date = {
          $gte: new Date(queryYear, startMonth, 1),
          $lte: new Date(queryYear, endMonth, 0, 23, 59, 59, 999),
        };
      }

      const expenses = await Expense.find(query);

      // Category counts
      const categoryMap: { [key: string]: number } = {};
      Object.values(ExpenseCategory).forEach(cat => {
        categoryMap[cat] = 0;
      });

      expenses.forEach(exp => {
        if (categoryMap[exp.category] !== undefined) {
          categoryMap[exp.category] += exp.amount;
        } else {
          categoryMap[exp.category] = exp.amount;
        }
      });

      const pieData = Object.keys(categoryMap).map(name => ({
        name,
        value: Number(categoryMap[name].toFixed(2)),
      })).filter(item => item.value > 0);

      // Monthly Trend
      const queryYear = year ? Number(year) : new Date().getFullYear();
      const monthlyTrendData = Array.from({ length: 12 }, (_, i) => ({
        name: new Date(queryYear, i).toLocaleString('default', { month: 'short' }),
        amount: 0,
      }));

      const allYearExpenses = await Expense.find({
        companyId: req.user?.companyId,
        date: {
          $gte: new Date(queryYear, 0, 1),
          $lte: new Date(queryYear, 11, 31, 23, 59, 59, 999),
        }
      });

      allYearExpenses.forEach(exp => {
        const monthIdx = new Date(exp.date).getMonth();
        monthlyTrendData[monthIdx].amount += exp.amount;
      });

      res.status(200).json({ breakdown: pieData, trend: monthlyTrendData });
    } catch (err) {
      next(err);
    }
  }
);

// 41. Profit & Loss data breakdown
app.get(
  '/api/reports/profit-loss',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vehicleId, month, year } = req.query;
      const query: any = { companyId: req.user?.companyId };

      if (vehicleId) query.vehicleId = vehicleId;

      if (month || year) {
        const queryYear = year ? Number(year) : new Date().getFullYear();
        const startMonth = month ? Number(month) - 1 : 0;
        const endMonth = month ? Number(month) : 12;

        query.date = {
          $gte: new Date(queryYear, startMonth, 1),
          $lte: new Date(queryYear, endMonth, 0, 23, 59, 59, 999),
        };
      }

      const expensesList = await Expense.find(query).populate('vehicleId').sort({ date: -1 });
      const incomesList = await Income.find(query).populate('vehicleId').sort({ date: -1 });

      const totalExp = expensesList.reduce((acc, exp) => acc + exp.amount, 0);
      const totalInc = incomesList.reduce((acc, inc) => acc + inc.amount, 0);
      const net = totalInc - totalExp;

      res.status(200).json({
        totalRevenues: totalInc,
        totalExpenditures: totalExp,
        netProfit: net,
        incomes: incomesList,
        expenses: expensesList,
      });
    } catch (err) {
      next(err);
    }
  }
);

// 42. PDFKit PDF Exporter for Profit & Loss Statement (FR-RPT-03)
app.get(
  '/api/reports/profit-loss/pdf',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { vehicleId, month, year } = req.query;
      const query: any = { companyId: req.user?.companyId };

      let targetVehicle: any = null;
      if (vehicleId) {
        query.vehicleId = vehicleId;
        targetVehicle = await Vehicle.findById(vehicleId);
      }

      if (month || year) {
        const queryYear = year ? Number(year) : new Date().getFullYear();
        const startMonth = month ? Number(month) - 1 : 0;
        const endMonth = month ? Number(month) : 12;

        query.date = {
          $gte: new Date(queryYear, startMonth, 1),
          $lte: new Date(queryYear, endMonth, 0, 23, 59, 59, 999),
        };
      }

      const expensesList = await Expense.find(query).populate('vehicleId').sort({ date: -1 });
      const incomesList = await Income.find(query).populate('vehicleId').sort({ date: -1 });

      const totalExp = expensesList.reduce((acc, exp) => acc + exp.amount, 0);
      const totalInc = incomesList.reduce((acc, inc) => acc + inc.amount, 0);
      const net = totalInc - totalExp;

      // Stream PDFKit response
      const doc = new PDFDocument({ margin: 50 });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="profit-loss-statement.pdf"');
      doc.pipe(res);

      // Header branding
      doc.fontSize(20).fillColor('#1e1b4b').text('FleetMaster Pro', { align: 'left' });
      doc.fontSize(10).fillColor('#64748b').text('Enterprise Fleet Management commands ledger', { align: 'left' });
      doc.moveDown(1.5);

      // Meta grid
      doc.font('Helvetica-Bold').fontSize(14).fillColor('#000').text('PROFIT & LOSS STATEMENT');
      doc.font('Helvetica').fontSize(9).fillColor('#475569');
      doc.text(`Scope: ${targetVehicle ? 'Vehicle ' + targetVehicle.regNumber : 'Whole fleet active list'}`);
      doc.text(`Timeline: ${month ? 'Month index: ' + month : 'All Year months'} - Year: ${year || new Date().getFullYear()}`);
      doc.text(`Generated: ${new Date().toLocaleString()}`);
      doc.moveDown(1.5);

      // Financial Overviews
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#000').text('Financial Highlights');
      doc.font('Helvetica');
      doc.rect(50, doc.y, 500, 1).fill('#cbd5e1');
      doc.moveDown(0.5);

      doc.fontSize(10);
      doc.text(`Total Revenues: $${totalInc.toFixed(2)}`);
      doc.text(`Total Expenditures: $${totalExp.toFixed(2)}`);
      
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').fontSize(12).fillColor(net >= 0 ? '#10b981' : '#ef4444').text(`NET STATEMENT PROFIT/LOSS: $${net.toFixed(2)}`);
      doc.font('Helvetica');
      doc.moveDown(1.5);

      // Incomes breakdown table
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#000').text('Itemized Revenues Ledger');
      doc.font('Helvetica');
      doc.rect(50, doc.y, 500, 1).fill('#cbd5e1');
      doc.moveDown(0.5);

      doc.fontSize(8).fillColor('#475569');
      if (incomesList.length === 0) {
        doc.text('No revenues recorded for this period.');
      } else {
        incomesList.forEach(inc => {
          const dateStr = new Date(inc.date).toLocaleDateString();
          doc.text(`[${dateStr}] [${inc.source}] - Vehicle: ${(inc.vehicleId as any)?.regNumber || 'N/A'} - Description: ${inc.description} ➔ $${inc.amount.toFixed(2)}`);
        });
      }
      doc.moveDown(1.5);

      // Expenses breakdown table
      doc.font('Helvetica-Bold').fontSize(11).fillColor('#000').text('Itemized Expenditures Ledger');
      doc.font('Helvetica');
      doc.rect(50, doc.y, 500, 1).fill('#cbd5e1');
      doc.moveDown(0.5);

      doc.fontSize(8).fillColor('#475569');
      if (expensesList.length === 0) {
        doc.text('No expenses logged for this period.');
      } else {
        expensesList.forEach(exp => {
          const dateStr = new Date(exp.date).toLocaleDateString();
          doc.text(`[${dateStr}] [${exp.category}] - Vehicle: ${(exp.vehicleId as any)?.regNumber || 'N/A'} - Note: ${exp.notes || 'N/A'} ➔ $${exp.amount.toFixed(2)}`);
        });
      }

      doc.moveDown(3);
      doc.fontSize(8).fillColor('#94a3b8').text('This document was dynamically compiled via FleetMaster Pro secure PDFKit streaming engines. Page 1 of 1.', { align: 'center' });

      doc.end();
    } catch (err) {
      next(err);
    }
  }
);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : {},
  });
});

// Start DB and Server
const PORT = process.env.PORT || 5000;
const startServer = async () => {
  await connectDB();

  // Initialize and start Daily 9:00 AM Cron Scheduler
  setSocketServerForScheduler(io);
  startScheduler();

  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
};

startServer();
