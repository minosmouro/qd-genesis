"""
Migration script to add missing fields to Property model for frontend compatibility
"""
import sqlite3
import os
from datetime import datetime

def run_migration():
    """Execute the migration to add missing fields."""
    db_path = os.path.join(os.path.dirname(__file__), '..', 'gandalf.db')
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        print("Starting migration to add property fields...")
        
        # Add pricing fields
        pricing_fields = [
            "ALTER TABLE property ADD COLUMN price_rent NUMERIC",
            "ALTER TABLE property ADD COLUMN condo_fee_exempt BOOLEAN DEFAULT 0",
            "ALTER TABLE property ADD COLUMN iptu_exempt BOOLEAN DEFAULT 0"
        ]
        
        # Add property classification fields
        classification_fields = [
            "ALTER TABLE property ADD COLUMN category VARCHAR(100)"
        ]
        
        # Add property features fields
        feature_fields = [
            "ALTER TABLE property ADD COLUMN features TEXT",  # JSON stored as TEXT
            "ALTER TABLE property ADD COLUMN custom_features TEXT"
        ]
        
        # Add condominium fields
        condo_fields = [
            "ALTER TABLE property ADD COLUMN building_name VARCHAR(255)",
            "ALTER TABLE property ADD COLUMN condo_features TEXT",  # JSON stored as TEXT
            "ALTER TABLE property ADD COLUMN custom_condo_features TEXT",
            "ALTER TABLE property ADD COLUMN delivery_at VARCHAR(20)"
        ]
        
        # Execute all migrations
        all_fields = pricing_fields + classification_fields + feature_fields + condo_fields
        
        for sql in all_fields:
            try:
                cursor.execute(sql)
                print(f"✓ Executed: {sql}")
            except sqlite3.OperationalError as e:
                if "duplicate column name" in str(e):
                    print(f"⚠ Column already exists: {sql}")
                else:
                    raise e
        
        # Commit changes
        conn.commit()
        print("✅ Migration completed successfully!")
        
        # Verify columns were added
        cursor.execute("PRAGMA table_info(property)")
        columns = [row[1] for row in cursor.fetchall()]
        
        new_columns = [
            'price_rent', 'condo_fee_exempt', 'iptu_exempt', 'category',
            'features', 'custom_features', 'building_name', 'condo_features',
            'custom_condo_features', 'delivery_at'
        ]
        
        print("\n📊 Column verification:")
        for col in new_columns:
            status = "✅" if col in columns else "❌"
            print(f"{status} {col}")
            
    except Exception as e:
        conn.rollback()
        print(f"❌ Migration failed: {str(e)}")
        raise
    finally:
        conn.close()

if __name__ == "__main__":
    run_migration()
