<?php

function is_valid_email(string $value): bool
{
    return (bool) preg_match('/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/', $value);
}

function is_valid_phone(string $value): bool
{
    if (!preg_match('/^[+()\-.\s0-9]+$/', $value)) {
        return false;
    }
    $digitCount = strlen(preg_replace('/[^0-9]/', '', $value));
    return $digitCount == 11;
}

function check_password_rules(string $value): array
{
    return [
        'len'     => strlen($value) >= 8,
        'upper'   => (bool) preg_match('/[A-Z]/', $value),
        'lower'   => (bool) preg_match('/[a-z]/', $value),
        'num'     => (bool) preg_match('/[0-9]/', $value),
        'special' => (bool) preg_match('/[^A-Za-z0-9]/', $value),
    ];
}

function password_rules_passed(array $checks): bool
{
    return !in_array(false, $checks, true);
}

/**
 * Strip common formatting characters (spaces, dashes, dots, parentheses)
 * from a phone number so "0917 123 4567", "0917-123-4567", and
 * "(0917) 123.4567" all compare as the same number. Used both to check
 * for duplicates and, ideally, on the SQL side via the matching
 * normalize_phone_sql() expression below.
 */
function normalize_phone(string $value): string
{
    return preg_replace('/[\s\-\.\(\)]+/', '', $value);
}

function normalize_phone_sql(string $column): string
{
    return "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE($column, ' ', ''), '-', ''), '.', ''), '(', ''), ')', '')";
}
