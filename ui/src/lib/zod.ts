import { z, ZodType } from "zod";

export function injectDefaults<T extends z.ZodTypeAny>(
  schema: T,
  defaults: z.infer<T>
): z.ZodDefault<T> {
  return addDefaultsRecursively(schema, defaults) as z.ZodDefault<T>;
}

export function fallback<T>(value: T): ZodType<T> {
  return z.any().transform(() => value);
}

function addDefaultsRecursively<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  defaultValue: z.infer<TSchema>
): z.ZodTypeAny {
  // If this is already a ZodDefault, unwrap it first
  if (schema instanceof z.ZodDefault) {
    schema = schema.def.innerType as TSchema;
  }

  if (schema instanceof z.ZodObject) {
    const shape = schema.def.shape as Record<string, z.ZodTypeAny>;
    const newShape: Record<string, z.ZodTypeAny> = {};

    // Process each property in the object
    for (const [key, fieldSchema] of Object.entries(shape)) {
      if (
        defaultValue &&
        typeof defaultValue === "object" &&
        defaultValue !== null &&
        key in defaultValue
      ) {
        const fieldDefault = (defaultValue as Record<string, unknown>)[key];

        // Recursively add defaults to nested objects
        if (
          fieldSchema instanceof z.ZodObject &&
          fieldDefault &&
          typeof fieldDefault === "object" &&
          fieldDefault !== null
        ) {
          newShape[key] = addDefaultsRecursively(
            fieldSchema,
            fieldDefault as Record<string, unknown>
          )
            .default(fieldDefault)
            .or(fallback(fieldDefault));
        } else if (
          "default" in fieldSchema &&
          typeof (fieldSchema as any).default === "function"
        ) {
          // For primitive fields, add the default using proper typing
          newShape[key] = (fieldSchema as z.ZodTypeAny)
            .default(fieldDefault)
            .or(fallback(fieldDefault));
        } else {
          newShape[key] = fieldSchema as z.ZodTypeAny;
        }
      } else {
        newShape[key] = fieldSchema as z.ZodTypeAny;
      }
    }

    // Create new object schema with updated shape and add default
    const newObjectSchema = z.object(newShape);
    return newObjectSchema
      .default(defaultValue as Record<string, unknown>)
      .or(fallback(defaultValue));
  }

  // For non-object schemas, add the default using proper typing
  if ("default" in schema && typeof (schema as any).default === "function") {
    return (schema as z.ZodTypeAny)
      .default(defaultValue)
      .or(fallback(defaultValue));
  }

  return schema;
}
