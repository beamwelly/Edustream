from datetime import datetime
from typing import Optional, Any
from sqlalchemy import String, Boolean, DateTime, Text, Float, Integer, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from app.database.base import Base

class FinancialGoal(Base):
    __tablename__ = "financial_goals"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    target_amount: Mapped[float] = mapped_column(Float, nullable=False)
    current_saved: Mapped[float] = mapped_column(Float, nullable=False)
    monthly_sip: Mapped[float] = mapped_column(Float, nullable=False)
    timeline_years: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

class VaultFamilyMember(Base):
    __tablename__ = "vault_family_members"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    relationship: Mapped[str] = mapped_column(String(100), nullable=False)
    dob: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. "15-Jan-1990"
    pan_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    aadhaar_last_four: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    blood_group: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

class VaultInsurancePolicy(Base):
    __tablename__ = "vault_insurance_policies"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    policy_type: Mapped[str] = mapped_column(String(100), nullable=False)  # Life, Health, etc.
    company: Mapped[str] = mapped_column(String(255), nullable=False) # e.g. LIC
    policy_number: Mapped[str] = mapped_column(String(100), nullable=False)
    sum_assured: Mapped[float] = mapped_column(Float, nullable=False)
    premium_amount: Mapped[float] = mapped_column(Float, nullable=False) # Premium Per Year
    expiry_date: Mapped[Optional[str]] = mapped_column(String(100), nullable=True) # Maturity / Expiry
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

class VaultInvestment(Base):
    __tablename__ = "vault_investments"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    investment_type: Mapped[str] = mapped_column(String(100), nullable=False)  # EPF / PPF, Mutual Fund, Real Estate
    scheme_name: Mapped[str] = mapped_column(String(255), nullable=False)
    account_folio_number: Mapped[str] = mapped_column(String(100), nullable=False)
    current_value: Mapped[float] = mapped_column(Float, nullable=False)
    nominee: Mapped[str] = mapped_column(String(255), nullable=False)
    institution: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

class VaultImportantDocument(Base):
    __tablename__ = "vault_important_documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    document_name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_location: Mapped[str] = mapped_column(String(255), nullable=False) # e.g. Home Safe, DigiLocker
    last_updated: Mapped[str] = mapped_column(String(100), nullable=False)
    digital_copy_stored_at: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. Done, Active
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

class VaultEmergencyContact(Base):
    __tablename__ = "vault_emergency_contacts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    relationship: Mapped[str] = mapped_column(String(100), nullable=False)
    mobile: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    role_purpose: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

class VaultBankAccount(Base):
    __tablename__ = "vault_bank_accounts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    bank_card_name: Mapped[str] = mapped_column(String(255), nullable=False)
    account_type: Mapped[str] = mapped_column(String(100), nullable=False)  # Savings, Salary, Credit Card
    last_four_digits: Mapped[str] = mapped_column(String(20), nullable=False)
    branch_limit: Mapped[str] = mapped_column(String(255), nullable=False) # Branch Name or Credit Limit
    nominee: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. Active, Blocked
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

class VaultLoan(Base):
    __tablename__ = "vault_loans"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    loan_name: Mapped[str] = mapped_column(String(255), nullable=False)
    lender: Mapped[str] = mapped_column(String(255), nullable=False)
    outstanding_amount: Mapped[float] = mapped_column(Float, nullable=False)
    emi: Mapped[float] = mapped_column(Float, nullable=False)
    interest_rate: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

class VaultNominee(Base):
    __tablename__ = "vault_nominees"
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    relationship: Mapped[str] = mapped_column(String(100), nullable=False)
    allocation_percentage: Mapped[float] = mapped_column(Float, nullable=False)
    associated_asset: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

class WOWUserInputs(Base):
    __tablename__ = "wow_user_inputs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, unique=True, index=True, nullable=False)
    retirement_inputs: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    cost_of_delay_inputs: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    sip_home_loan_inputs: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    freedom_date_inputs: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )
