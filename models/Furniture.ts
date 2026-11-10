import House, {
  IHouse,
  PropertyType,
  TransactionType,
  IntendedPurpose,
  HouseStatus,
  ApprovalStatus,
  VerificationStatus
} from './House';

// Furniture and Engineering Product Model Alias for FMS / MAT Engineering
export const Furniture = House;
export type IFurniture = IHouse;

export {
  PropertyType,
  TransactionType,
  IntendedPurpose,
  HouseStatus,
  ApprovalStatus,
  VerificationStatus
};

export default Furniture;
