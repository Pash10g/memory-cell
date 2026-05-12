# EDD Skill — Entity Document Diagram for MongoDB

A coding-agent skill that teaches your AI assistant **EDD (Entity Document Diagram)** — a concise, ERD-inspired notation purpose-built for MongoDB schema design.

## Installation

```bash
npx skills add @mongodb-developer/edd-skill
```

## What It Does

Once installed, this skill activates whenever you:

- Design, review, or generate a MongoDB schema
- Model embedding vs. referencing decisions
- Ask for a schema diagram, data model, or entity diagram
- Write code that touches collection structure
- Ask casual questions like *"how should I structure this in Mongo?"*

The skill gives your coding agent a shared, unambiguous vocabulary for MongoDB data shapes — including embedded documents, extended references, bounded arrays, and polymorphic fields.

## What's Included

| File | Purpose |
|------|---------|
| `SKILL.md` | Full EDD notation reference, design rules, Mermaid diagram generation, and worked examples |
| `references/code-patterns.md` | Ready-to-use code snippets for Mongoose, TypeScript, Zod, `$jsonSchema`, and aggregation |

## EDD Quick Reference

| Construct | Syntax | Meaning |
|-----------|--------|---------|
| Scalar | `field: type` | Simple value |
| Embedded entity | `field: EntityName` | Subdocument |
| Extended reference | `field: Entity{f1,f2,...}` | Denormalized subset from another collection |
| Array | `field: type[min,avg,max]` | Array with cardinality 3-tuple |
| Polymorphic | `field: oneOf(A,B,C)` | Multiple possible shapes |

## Example

```
Entity: Order    [indexes: {buyerId:1,createdAt:-1}, {status:1}]

  _id: ObjectId
  buyer: User{_id,displayName,email}    # extended reference
  lineItems: LineItem[1,5,50]
  payment: oneOf(CreditCard,PayPal,BankTransfer)
  status: string
  total: decimal128
  createdAt: date
```

Every EDD output automatically includes a **Mermaid `erDiagram`** block for visual rendering.

## License

Apache-2.0
