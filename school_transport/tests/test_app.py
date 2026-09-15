import os
import sys
import tempfile

import pytest

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app as flask_app, init_db, seed_demo_data


@pytest.fixture
def client():
    fd, db_path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    flask_app.config['TESTING'] = True
    flask_app.config['SECRET_KEY'] = 'test-secret'
    flask_app.config['DATABASE'] = db_path
    with flask_app.app_context():
        init_db()
        seed_demo_data()
    with flask_app.test_client() as client:
        yield client
    os.remove(db_path)


def test_login_and_dashboard_access(client):
    resp = client.post('/login', data={'username': 'admin', 'password': 'admin123'}, follow_redirects=True)
    assert resp.status_code == 200
    assert b'Admin Dashboard' in resp.data


def test_parent_has_multiple_child_links_and_cannot_access_admin_pages(client):
    resp = client.post('/login', data={'username': 'parent1', 'password': 'parent123'}, follow_redirects=True)
    assert resp.status_code == 200
    assert b'My Children' in resp.data
    assert b'Aarav Sharma' in resp.data
    assert b'Diya Patel' in resp.data
    assert b'Ishaan Rao' in resp.data

    admin_resp = client.get('/students')
    assert admin_resp.status_code == 403

    dashboard_resp = client.get('/dashboard')
    assert dashboard_resp.status_code in (302, 403)


def test_parent_access_forbidden_and_missing_routes_return_correct_status(client):
    client.post('/login', data={'username': 'parent1', 'password': 'parent123'}, follow_redirects=True)

    forbidden_resp = client.get('/students')
    assert forbidden_resp.status_code == 403
    assert b'Access Denied' in forbidden_resp.data

    direct_denied = client.get('/access-denied')
    assert direct_denied.status_code == 403
    assert b'Access Denied' in direct_denied.data

    missing = client.get('/nonexistent-page')
    assert missing.status_code == 404
    assert b'Page Not Found' in missing.data


def test_parent_cannot_see_unlinked_student_detail(client):
    client.post('/login', data={'username': 'parent1', 'password': 'parent123'}, follow_redirects=True)
    student_id = 3
    resp = client.get(f'/students/{student_id}')
    assert resp.status_code == 403


def test_assignment_shows_route_with_boarding_location(client):
    client.post('/login', data={'username': 'admin', 'password': 'admin123'}, follow_redirects=True)
    resp = client.get('/assignments')
    assert resp.status_code == 200
    # Combined "Route Name [Boarding Location]" format
    assert b'[' in resp.data and b']' in resp.data


def test_record_boarded_status_and_timestamp(client):
    client.post('/login', data={'username': 'admin', 'password': 'admin123'}, follow_redirects=True)
    resp = client.post(
        '/movements',
        data={'student_id': '20', 'movement_type': 'boarding', 'notes': 'test'},
        follow_redirects=True,
    )
    assert resp.status_code == 200
    assert b'Movement recorded successfully' in resp.data

    detail_resp = client.get('/students/20')
    assert b'Boarded' in detail_resp.data


def test_record_dropped_off_status_and_timestamp(client):
    client.post('/login', data={'username': 'admin', 'password': 'admin123'}, follow_redirects=True)
    client.post('/movements', data={'student_id': '21', 'movement_type': 'boarding'}, follow_redirects=True)
    resp = client.post(
        '/movements',
        data={'student_id': '21', 'movement_type': 'drop_off'},
        follow_redirects=True,
    )
    assert resp.status_code == 200

    detail_resp = client.get('/students/21')
    assert b'Dropped Off' in detail_resp.data


def test_invalid_movement_type_rejected(client):
    client.post('/login', data={'username': 'admin', 'password': 'admin123'}, follow_redirects=True)
    resp = client.post(
        '/movements',
        data={'student_id': '22', 'movement_type': 'bogus_status'},
        follow_redirects=True,
    )
    assert resp.status_code == 200
    assert b'Invalid movement' in resp.data


def test_duplicate_vehicle_number_rejected(client):
    client.post('/login', data={'username': 'admin', 'password': 'admin123'}, follow_redirects=True)
    resp = client.post(
        '/vehicles',
        data={
            'vehicle_id': 'VH-999',
            'vehicle_number': 'KA-01-AB-1234',  # already exists in seed data
            'vehicle_type': 'School Bus',
            'capacity': '30',
        },
        follow_redirects=True,
    )
    assert resp.status_code == 200
    assert b'already exists' in resp.data


def test_new_vehicle_can_be_added_without_code_changes(client):
    client.post('/login', data={'username': 'admin', 'password': 'admin123'}, follow_redirects=True)
    resp = client.post(
        '/vehicles',
        data={
            'vehicle_id': 'VH-999',
            'vehicle_number': 'MH12AB2021',
            'vehicle_type': 'School Bus',
            'capacity': '30',
        },
        follow_redirects=True,
    )
    assert resp.status_code == 200
    assert b'Vehicle added successfully' in resp.data

    list_resp = client.get('/vehicles')
    assert b'MH12AB2021' in list_resp.data


def test_movement_timestamp_persists_in_database(client):
    import sqlite3
    client.post('/login', data={'username': 'admin', 'password': 'admin123'}, follow_redirects=True)
    client.post('/movements', data={'student_id': '5', 'movement_type': 'boarding'}, follow_redirects=True)

    conn = sqlite3.connect(flask_app.config['DATABASE'])
    row = conn.execute(
        "SELECT movement_type, movement_date, movement_time FROM student_movements "
        "WHERE student_id = 5 ORDER BY id DESC LIMIT 1"
    ).fetchone()
    conn.close()

    assert row is not None
    assert row[0] == 'boarding'
    assert row[1]  # date recorded
    assert row[2]  # time recorded


def test_parent_can_pay_linked_child_transport_fee_and_admin_can_view_payment(client):
    client.post('/login', data={'username': 'parent1', 'password': 'parent123'}, follow_redirects=True)
    fees_page = client.get('/fees')
    assert fees_page.status_code == 200
    assert b'Transport Fees' in fees_page.data

    import sqlite3
    conn = sqlite3.connect(flask_app.config['DATABASE'])
    fee_id = conn.execute(
        "SELECT id FROM transport_fees WHERE student_id = 1 ORDER BY id DESC LIMIT 1"
    ).fetchone()[0]
    conn.close()

    payment = client.post(
        '/fees/pay',
        data={'fee_id': str(fee_id), 'amount': '500', 'payment_method': 'UPI'},
        follow_redirects=True,
    )
    assert payment.status_code == 200
    assert b'Payment of INR 500.00 completed' in payment.data

    client.get('/logout')
    client.post('/login', data={'username': 'admin', 'password': 'admin123'}, follow_redirects=True)
    admin_fees = client.get('/fees')
    assert b'Recent payments' in admin_fees.data
    assert b'500.00' in admin_fees.data


def test_parent_cannot_pay_an_unlinked_students_fee(client):
    client.post('/login', data={'username': 'parent1', 'password': 'parent123'}, follow_redirects=True)
    client.get('/fees')
    import sqlite3
    conn = sqlite3.connect(flask_app.config['DATABASE'])
    fee_id = conn.execute(
        "SELECT id FROM transport_fees WHERE student_id = 3 ORDER BY id DESC LIMIT 1"
    ).fetchone()[0]
    conn.close()

    response = client.post('/fees/pay', data={'fee_id': str(fee_id), 'amount': '100', 'payment_method': 'UPI'})
    assert response.status_code == 403
