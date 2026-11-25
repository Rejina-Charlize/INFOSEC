# MedStock MongoDB Data Model

The application stores data in MongoDB using the `users`, `categories`, `medicines`, `medicine_batches`, and `stock_movements` collections. Medicine documents embed a category snapshot; batch and movement documents keep UUID references to their medicine and batch.

```mermaid
 CATEGORIES ||--o{ MEDICINES : "embedded category snapshot"
    MEDICINES ||--o{ MEDICINE_BATCHES : "medicineId reference"
    MEDICINES ||--o{ STOCK_MOVEMENTS : "medicineId reference"
    MEDICINE_BATCHES ||--o{ STOCK_MOVEMENTS : "batchId reference"

    USERS {
        uuid _id
        string username
        string normalizedUsername UK
        string passwordHash
        string role
        boolean enabled
        datetime createdAt
    }
    CATEGORIES {
        uuid _id
        string name
        string normalizedName UK
        string description
        boolean active
    }
    MEDICINES {
        uuid _id
        string sku
        string normalizedSku UK
        string name
        object category
        decimal unitPrice
        decimal costPrice
        boolean prescriptionRequired
        integer reorderThreshold
        boolean archived
    }
    MEDICINE_BATCHES {
        uuid _id
        uuid medicineId
        string batchNumber
        date expirationDate
        integer currentQuantity
        string status
    }
    STOCK_MOVEMENTS {
        uuid _id
        uuid medicineId
        uuid batchId
        string batchNumber
        string movementType
        integer quantityDelta
        datetime createdAt
    }
```

`medicine_batches` has a unique compound index on `medicineId` and `batchNumber`. UUIDs are stored using MongoDB's standard UUID representation. These are document references, not relational foreign keys; referential integrity is enforced by the application.

The local profile inserts four lookup categories and five clearly labeled demo medicine records with sample batches and stock movements when their SKUs are absent. Do not use this sample inventory as real pharmacy stock.
