# EDD Code Patterns

Ready-to-use snippets for translating EDD notation into code.

---

## Mongoose

### Scalar fields
```ts
name: { type: String, required: true },
total: { type: mongoose.Types.Decimal128 },
createdAt: { type: Date, default: Date.now },
```

### Embedded Entity
```ts
// Entity: Address
const AddressSchema = new Schema({
  street: String,
  city: String,
  countryCode: String,
  postalCode: String,
}, { _id: false });

// In parent:
address: { type: AddressSchema, required: true },
```

### Embedded Array with cardinality guard
```ts
// addresses: Address[0,2,5]
addresses: {
  type: [AddressSchema],
  default: [],
  validate: {
    validator: (v: unknown[]) => v.length <= 5,
    message: 'addresses exceeds max cardinality of 5',
  },
},
```

### Extended Reference
```ts
// seller: User{_id, displayName, avatarUrl}
// extended ref from User — snapshot at write time
seller: {
  _id: { type: Schema.Types.ObjectId, required: true },
  displayName: { type: String, required: true },
  avatarUrl: String,
},
```

### Polymorphic (oneOf)
```ts
// payment: oneOf(CreditCard, PayPal, BankTransfer)
const CreditCardSchema = new Schema({ type: { type: String, enum: ['credit_card'] }, last4: String, brand: String, expMonth: Number, expYear: Number }, { _id: false });
const PayPalSchema     = new Schema({ type: { type: String, enum: ['paypal'] },      email: String, payerId: String }, { _id: false });
const BankSchema       = new Schema({ type: { type: String, enum: ['bank_transfer'] }, iban: String, swift: String }, { _id: false });

// In parent — store as Mixed, validate discriminant at app layer:
payment: { type: Schema.Types.Mixed, required: true },
```

---

## TypeScript Interfaces

### Extended Reference
```ts
// seller: User{_id, displayName, avatarUrl}
// extended ref from User — snapshot at write time
interface SellerRef {
  _id: ObjectId;
  displayName: string;
  avatarUrl?: string;
}
```

### Polymorphic discriminated union
```ts
interface CreditCard    { type: 'credit_card'; last4: string; brand: string; expMonth: number; expYear: number }
interface PayPal        { type: 'paypal'; email: string; payerId: string }
interface BankTransfer  { type: 'bank_transfer'; iban: string; swift: string }

type Payment = CreditCard | PayPal | BankTransfer;
```

### Array cardinality (type-level comment)
```ts
/** [min:0, avg:2, max:5] */
addresses: Address[];
```

---

## Zod

### Embedded Entity
```ts
const AddressSchema = z.object({
  street: z.string(),
  city: z.string(),
  countryCode: z.string(),
  postalCode: z.string(),
});
```

### Extended Reference
```ts
// extended ref from User — snapshot at write time
const SellerRefSchema = z.object({
  _id: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().optional(),
});
```

### Array with cardinality
```ts
// addresses: Address[0,2,5]
addresses: AddressSchema.array().max(5),
```

### Polymorphic (discriminated union)
```ts
const PaymentSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('credit_card'), last4: z.string(), brand: z.string(), expMonth: z.number(), expYear: z.number() }),
  z.object({ type: z.literal('paypal'), email: z.string(), payerId: z.string() }),
  z.object({ type: z.literal('bank_transfer'), iban: z.string(), swift: z.string() }),
]);
```

---

## MongoDB $jsonSchema Validator

```js
db.createCollection('orders', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['buyer', 'lineItems', 'payment', 'status', 'total', 'createdAt'],
      properties: {
        buyer: {
          bsonType: 'object',
          required: ['_id', 'displayName'],
          description: 'extended ref from User',
        },
        lineItems: {
          bsonType: 'array',
          minItems: 1,
          maxItems: 50,
          items: { bsonType: 'object', required: ['productId', 'unitPrice', 'qty'] },
        },
        payment: {
          bsonType: 'object',
          required: ['type'],
        },
      },
    },
  },
});
```

---

## Aggregation — Joining Back to Source from Extended Reference

When you need the full source document (not just the extended ref fields):

```js
// seller stored as extended ref; join back to get full User
db.orders.aggregate([
  {
    $lookup: {
      from: 'users',
      localField: 'seller._id',   // always include _id in extended ref
      foreignField: '_id',
      as: 'sellerFull',
    },
  },
  { $unwind: { path: '$sellerFull', preserveNullAndEmpty: true } },
]);
```