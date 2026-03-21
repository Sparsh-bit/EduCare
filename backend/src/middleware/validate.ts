import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain, FieldValidationError } from 'express-validator';

export const validate = (validations: ValidationChain[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        await Promise.all(validations.map((v) => v.run(req)));

        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }

        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map((err) => ({
                field: (err as FieldValidationError).path ?? (err as FieldValidationError).location,
                message: err.msg,
            })),
        });
    };
};
