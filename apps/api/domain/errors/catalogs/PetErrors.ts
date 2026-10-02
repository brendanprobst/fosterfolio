import { ResultError } from '@api/domain/errors/ResultError';

export class PetErrors {
  static readonly NOT_FOUND = ResultError.create(
    'PET_NOT_FOUND',
    "We couldn't find that pet. It may have been removed.",
    404
  );

  static readonly FORBIDDEN = ResultError.create(
    'PET_FORBIDDEN',
    'You can only change pets you own.',
    403
  );

  static readonly INVALID_INPUT = ResultError.create(
    'PET_INVALID_INPUT',
    'Please provide valid pet details.',
    400
  );

  static readonly NAME_REQUIRED = ResultError.create(
    'PET_NAME_REQUIRED',
    'Please provide a non-empty name for the pet.',
    400
  );

  static readonly SPECIES_INVALID = ResultError.create(
    'PET_SPECIES_INVALID',
    'Species must be one of: dog, cat, rabbit, bird, other.',
    400
  );

  static readonly PHOTOS_INVALID = ResultError.create(
    'PET_PHOTOS_INVALID',
    'Each photo needs a valid image.',
    400
  );

  static readonly PHOTOS_LIMIT = ResultError.create(
    'PET_PHOTOS_LIMIT',
    'A pet can have up to 10 photos.',
    400
  );
}
