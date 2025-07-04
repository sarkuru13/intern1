// src/components/CourseCard.jsx
import React from 'react';

function CourseCard({ course }) {
    return (
        <div className="card">
            <div className="card-body">
                <h5 className="card-title">{course.Programme}</h5>
                <p className="card-text">
                    Duration: {course.Duration} <br />
                    Status: {course.Status}
                </p>
            </div>
        </div>
    );
}

export default CourseCard;
