"""
SQLAlchemy ORM models for the Nagpur Traffic Command backend.
"""

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship
from database import Base


class Location(Base):
    __tablename__ = "locations"

    junction_id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    risk_score = Column(Integer, nullable=False, default=0)
    risk_level = Column(String, nullable=False, default="Low")
    police_assigned = Column(Integer, nullable=False, default=0)
    unmanned_critical = Column(Boolean, nullable=False, default=False)

    # --- Raw feature columns for ML risk prediction ---
    traffic_volume = Column(Float, nullable=False, default=50.0)
    avg_speed = Column(Float, nullable=False, default=40.0)
    congestion_level = Column(Float, nullable=False, default=50.0)
    accident_count_recent = Column(Integer, nullable=False, default=0)
    violation_count = Column(Integer, nullable=False, default=0)
    illegal_parking_count = Column(Integer, nullable=False, default=0)
    obstruction_count = Column(Integer, nullable=False, default=0)
    weather = Column(String, nullable=False, default="clear")
    roadwork_flag = Column(Integer, nullable=False, default=0)
    event_flag = Column(Integer, nullable=False, default=0)
    police_coverage = Column(Integer, nullable=False, default=0)
    day_of_week = Column(Integer, nullable=False, default=0)
    time_of_day = Column(Integer, nullable=False, default=12)

    # Relationships
    risk_factors = relationship("RiskFactor", back_populates="location", lazy="joined")
    incidents = relationship(
        "Incident", back_populates="location", lazy="dynamic", order_by="Incident.timestamp.desc()"
    )


class Incident(Base):
    __tablename__ = "incidents"

    incident_id = Column(String, primary_key=True, index=True)
    junction_id = Column(String, ForeignKey("locations.junction_id"), nullable=False)
    type = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    resolved_flag = Column(Boolean, nullable=False, default=False)

    # Relationships
    location = relationship("Location", back_populates="incidents")


class RiskFactor(Base):
    __tablename__ = "risk_factors"

    id = Column(Integer, primary_key=True, autoincrement=True)
    junction_id = Column(String, ForeignKey("locations.junction_id"), nullable=False)
    factor = Column(String, nullable=False)
    contribution = Column(Float, nullable=False)

    # Relationships
    location = relationship("Location", back_populates="risk_factors")


class OverrideLog(Base):
    """Stores operator override actions for audit/history."""

    __tablename__ = "override_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    junction_id = Column(String, ForeignKey("locations.junction_id"), nullable=False)
    action = Column(String, nullable=False)  # "accept" | "modify" | "reject"
    officers = Column(Integer, nullable=True)
    timestamp = Column(DateTime, nullable=False)
    note = Column(Text, nullable=True)


class EmergencyDispatch(Base):
    __tablename__ = "emergency_dispatches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    to_junction_id = Column(String, ForeignKey("locations.junction_id"), nullable=False)
    from_source = Column(String, nullable=False)
    officer_count = Column(Integer, nullable=False)
    timestamp = Column(DateTime, nullable=False)
    status = Column(String, nullable=False)
    trigger_risk_level = Column(String, nullable=False)
