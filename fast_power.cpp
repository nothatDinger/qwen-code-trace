#include <iostream>
#include <cstdint>

// Efficiently computes (base^exponent) % modulus using fast exponentiation
// This function handles potential integer overflows by using modular arithmetic
// and is suitable for large numbers often used in competitive programming or cryptography.
int64_t fast_power_mod(int64_t base, int64_t exponent, int64_t modulus) {
    if (modulus == 1) return 0; // Any number mod 1 is 0
    base %= modulus; // Handle cases where base >= modulus
    int64_t result = 1;
    while (exponent > 0) {
        // If exponent is odd, multiply base with result
        if (exponent & 1) {
            result = (result * base) % modulus;
        }
        // Now exponent must be even
        exponent >>= 1; // exponent = exponent / 2
        base = (base * base) % modulus;
    }
    return result;
}

// Computes base^exponent for positive integers using fast exponentiation
// This version does not handle modulus and can lead to overflow for large results.
// It's efficient for cases where overflow is not a concern or for floating-point bases.
int64_t fast_power(int64_t base, int64_t exponent) {
    int64_t result = 1;
    while (exponent > 0) {
        // If exponent is odd, multiply base with result
        if (exponent & 1) {
            result *= base;
        }
        // Now exponent must be even
        exponent >>= 1; // exponent = exponent / 2
        base *= base;
    }
    return result;
}

int main() {
    int64_t base, exponent, modulus;

    // Example 1: Fast power without modulus
    std::cout << "=== Fast Power (Integer) ===" << std::endl;
    base = 2;
    exponent = 10;
    std::cout << base << "^" << exponent << " = " << fast_power(base, exponent) << std::endl;

    // Example 2: Fast power with modulus
    std::cout << "\n=== Fast Power Mod (Modular Exponentiation) ===" << std::endl;
    base = 2;
    exponent = 10;
    modulus = 1000;
    std::cout << "(" << base << "^" << exponent << ") % " << modulus 
              << " = " << fast_power_mod(base, exponent, modulus) << std::endl;

    // Example 3: Larger numbers with modulus
    base = 12345;
    exponent = 67890;
    modulus = 1000000007; // A common large prime used in competitive programming
    std::cout << "(" << base << "^" << exponent << ") % " << modulus 
              << " = " << fast_power_mod(base, exponent, modulus) << std::endl;

    return 0;
}