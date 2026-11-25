import React from 'react';

export default function ApiFieldError({ errors, field }) {
    const messages = errors[field.toLowerCase()];
    if (!messages?.length) return null;
    return <div role="alert" className="mt-1 text-sm text-brand-danger">
        {messages.map((message, index) => <div key={index}>{message}</div>)}
    </div>;
}
