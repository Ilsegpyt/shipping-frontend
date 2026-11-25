export const countryCodes = {
    Egypt: '+20', 'Saudi Arabia': '+966', 'United Arab Emirates': '+971',
    Qatar: '+974', Kuwait: '+965', Bahrain: '+973', Oman: '+968', Jordan: '+962',
};

function normalizeDigits(value) {
    return value.replace(/[٠-٩۰-۹]/g, digit => String(digit.charCodeAt(0) % 16));
}

export function sanitizePhoneInput(event) {
    const input = event.currentTarget;
    const raw = normalizeDigits(input.value);
    const cleaned = (raw.startsWith('+') ? '+' : '') + raw.replace(/[^0-9]/g, '');
    if (input.value !== cleaned) input.value = cleaned;
}

export function sanitizeCountryCode(value) {
    const raw = normalizeDigits(value);
    return (raw.startsWith('+') ? '+' : '') + raw.replace(/[^0-9]/g, '').slice(0, 3);
}

export function sanitizeNationalPhoneInput(event) {
    const input = event.currentTarget;
    const cleaned = normalizeDigits(input.value).replace(/[^0-9]/g, '');
    if (input.value !== cleaned) input.value = cleaned;
}
