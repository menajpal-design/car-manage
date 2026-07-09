// User Roles definition
export enum UserRole {
  OWNER = 'owner',
  DRIVER = 'driver',
  HELPER = 'helper',
  TECHNICIAN = 'technician',
  ACCOUNTANT = 'accountant'
}

// User Profile Interface
export interface IUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string;
  avatarUrl?: string;
  companyId?: string;
  assignedVehicleId?: string;
  licenseNumber?: string;
  licenseExpiry?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Vehicle Fuel Types
export type VehicleFuelType = 'Petrol' | 'Diesel' | 'CNG' | 'Electric';

// Vehicle Status
export enum VehicleStatus {
  ACTIVE = 'ACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
  IDLE = 'IDLE'
}

// Vehicle Document vault item
export interface IVehicleDocument {
  id?: string;
  type: string;
  documentUrl: string;
  issueDate: Date;
  expiryDate: Date;
  isVerified: boolean;
}

// Vehicle Interface
export interface IVehicle {
  id: string;
  regNumber: string;
  brand: string;
  model: string;
  year: number;
  engineNo: string;
  chassisNo: string;
  fuelType: VehicleFuelType;
  currentOdometer: number;
  lastServiceOdometer: number;
  lastFuelOdometer: number;
  documents: IVehicleDocument[];
  assignedDriver?: string;
  assignedHelper?: string;
  ownerCompanyId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Fuel Log Interface
export interface IFuelLog {
  id: string;
  vehicleId: string;
  driverId: string;
  companyId: string;
  fuelDate: Date;
  odoReading: number;
  liters: number;
  pricePerLiter: number;
  totalCost: number;
  fuelStation?: string;
  previousOdo: number;
  mileageCalculated: number;
  isOdoPhotoVerified: boolean;
  odoPhotoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Ticket Types
export enum TicketType {
  PREVENTIVE = 'Preventive',
  ENGINE = 'Engine',
  BRAKE = 'Brake',
  TYRE = 'Tyre',
  ELECTRICAL = 'Electrical',
  BODY = 'Body',
  AC = 'AC',
  OTHER = 'Other'
}

// Ticket Statuses
export enum TicketStatus {
  OPEN = 'Open',
  ASSIGNED = 'Assigned',
  IN_PROGRESS = 'InProgress',
  SOLVED_PENDING_PAYMENT = 'Solved_PendingPayment',
  SOLVED = 'Solved',
  CLOSED = 'Closed'
}

// Ticket Activity Log
export interface ITicketActivity {
  userId: string;
  action: string;
  timestamp: Date;
  details: string;
}

// Ticket Parts Used
export interface IPartsUsed {
  name: string;
  quantity: number;
  price: number;
}

// Ticket Solution
export interface ITicketSolution {
  description: string;
  partsUsed: IPartsUsed[];
  laborCost: number;
  totalCost: number;
}

// Ticket Interface
export interface ITicket {
  id: string;
  ticketNumber: string;
  vehicleId: any; // Populated or ID
  reportedById: any; // Populated or ID
  reportedByRole: UserRole | string;
  type: TicketType;
  status: TicketStatus;
  description: string;
  images: string[];
  voiceNoteUrl?: string;
  odoAtReport: number;
  assignedToId?: any; // Populated or ID (Technician)
  solution?: ITicketSolution;
  resolvedAt?: Date;
  closedAt?: Date;
  activityLog: ITicketActivity[];
  createdAt: Date;
  updatedAt: Date;
}

// Invoice Item
export interface IInvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

// Invoice Interface
export interface IInvoice {
  id: string;
  invoiceNumber: string;
  ticketId: string;
  companyId: string;
  vehicleId: any;
  customerName: string;
  items: IInvoiceItem[];
  subTotal: number;
  taxAmount: number;
  totalAmount: number;
  issuedDate: Date;
  dueDate: Date;
  status: 'Pending' | 'Paid' | 'Voided';
  createdAt: Date;
  updatedAt: Date;
}

// Payment Methods
export enum PaymentMethod {
  BKASH = 'Bkash',
  NAGAD = 'Nagad',
  CASH = 'Cash'
}

// Transaction Statuses
export enum TransactionStatus {
  PENDING = 'Pending',
  VERIFIED = 'Verified',
  REJECTED = 'Rejected',
  COMPLETED = 'Completed'
}

// Transaction Interface
export interface ITransaction {
  id: string;
  invoiceId: any;
  ticketId: any;
  companyId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  status: TransactionStatus;
  verifiedBy?: any;
  verifiedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Expense Category
export enum ExpenseCategory {
  FUEL = 'Fuel',
  SERVICE = 'Service',
  TOLL = 'Toll',
  PARKING = 'Parking',
  DRIVER_SALARY = 'DriverSalary',
  HELPER_SALARY = 'HelperSalary',
  TYRE = 'Tyre',
  DOCUMENT_RENEWAL = 'DocumentRenewal',
  OTHER = 'Other'
}

// Income Source
export enum IncomeSource {
  TRIP_FARE = 'TripFare',
  MONTHLY_RENT = 'MonthlyRent',
  OTHER = 'Other'
}

// Expense Interface
export interface IExpense {
  id: string;
  vehicleId: any;
  companyId: string;
  category: ExpenseCategory;
  amount: number;
  date: Date;
  odoReading?: number;
  recordedBy: any;
  ticketId?: any;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Income Interface
export interface IIncome {
  id: string;
  vehicleId: any;
  companyId: string;
  source: IncomeSource;
  amount: number;
  date: Date;
  description: string;
  recordedBy: any;
  createdAt: Date;
  updatedAt: Date;
}

// Trip Status
export enum TripStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// Trip Interface
export interface ITrip {
  id: string;
  tripNumber: string;
  vehicleId: string;
  driverId: string;
  helperId?: string;
  origin: string;
  destination: string;
  scheduledStartTime: Date;
  scheduledEndTime?: Date;
  actualStartTime?: Date;
  actualEndTime?: Date;
  status: TripStatus;
  startMileage?: number;
  endMileage?: number;
  cargoWeight?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Maintenance Status
export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}

// Maintenance Record Interface
export interface IMaintenanceRecord {
  id: string;
  vehicleId: string;
  description: string;
  cost: number;
  status: MaintenanceStatus;
  serviceDate: Date;
  completionDate?: Date;
  technicianName?: string;
  partsReplaced?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// JWT Token Payload structure
export interface IJWTPayload {
  userId: string;
  phone: string;
  role: UserRole;
  name: string;
  companyId?: string;
}

// Socket events enumeration
export enum SocketEvent {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  LOCATION_UPDATE = 'location_update',
  TRIP_STATUS_CHANGE = 'trip_status_change',
  NOTIFICATION = 'notification'
}

// Helper types or validators
export function isValidRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}
