from app import init_db, seed_demo_data


if __name__ == "__main__":
    init_db()
    seed_demo_data()
    print("Database initialized and demo data loaded successfully.")
