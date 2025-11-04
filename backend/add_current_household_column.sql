-- Add CurrentHouseholdId column to Users table
-- This script can be run if the migration fails due to existing data

ALTER TABLE Users ADD COLUMN CurrentHouseholdId INTEGER REFERENCES Households(Id);
