from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.review import Review
from pydantic import BaseModel

router = APIRouter(prefix="/reviews", tags=["Reviews"])

class ReviewCreate(BaseModel):
    author:    str
    dish:      Optional[str] = "General"
    rating:    int
    text:      str
    sentiment: Optional[str] = None
    topics:    Optional[str] = None
    ai_summary: Optional[str] = None

class ReviewOut(BaseModel):
    id:         int
    author:     str
    dish:       Optional[str]
    rating:     int
    text:       str
    sentiment:  Optional[str]
    topics:     Optional[str]
    ai_summary: Optional[str] = None

    class Config:
        from_attributes = True

@router.get("/", response_model=List[ReviewOut])
def get_all(db: Session = Depends(get_db)):
    return db.query(Review).order_by(Review.created_at.desc()).all()

@router.post("/", response_model=ReviewOut)
def create_review(review: ReviewCreate, db: Session = Depends(get_db)):
    new_review = Review(
        author    = review.author,
        dish      = review.dish,
        rating    = review.rating,
        text      = review.text,
        sentiment = review.sentiment,
        topics    = review.topics,
        ai_summary = review.ai_summary,
    )
    db.add(new_review)
    db.commit()
    db.refresh(new_review)
    return new_review

@router.delete("/{id}")
def delete_review(id: int, db: Session = Depends(get_db)):
    review = db.query(Review).filter(Review.id == id).first()
    if review:
        db.delete(review)
        db.commit()
    return {"message": "Deleted"}

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    reviews  = db.query(Review).all()
    total    = len(reviews)
    positive = len([r for r in reviews if r.sentiment == 'positive'])
    negative = len([r for r in reviews if r.sentiment == 'negative'])
    neutral  = len([r for r in reviews if r.sentiment == 'neutral'])
    avg_rating = round(sum(r.rating for r in reviews) / total, 1) if total else 0

    return {
        "total":      total,
        "positive":   positive,
        "negative":   negative,
        "neutral":    neutral,
        "avg_rating": avg_rating,
    }