# [Complex Math Functions](https://docs.python.org/3/library/cmath.html)

| Done | Name           | Description                                        |
|:----:|----------------|----------------------------------------------------|
|  ✅  | `e`            | Euler's number (2.718281828...).                   |
|  ✅  | `pi`           | Ratio of a circle's circumference to its diameter. |
|  ✅  | `tau`          | Tau (2π).                                          |
|  ✅  | `inf`          | Positive infinity (float).                         |
|  ✅  | `infj`         | Complex number with zero real and infinity imag.   |
|  ✅  | `nan`          | Not a number (NaN) as float.                       |
|  ✅  | `nanj`         | Complex number with zero real and NaN imag.        |
|      | `acos`         | Arc cosine of complex number.                      |
|      | `acosh`        | Inverse hyperbolic cosine.                         |
|      | `asin`         | Arc sine of complex number.                        |
|      | `asinh`        | Inverse hyperbolic sine.                           |
|      | `atan`         | Arc tangent of complex number.                     |
|      | `atanh`        | Inverse hyperbolic tangent.                        |
|  ✅  | `cos`          | Cosine of complex number.                          |
|  ✅  | `cosh`         | Hyperbolic cosine.                                 |
|  ✅  | `exp`          | e raised to the complex power.                     |
|      | `isclose`      | Test approximate equality of complex numbers.      |
|  ✅  | `isfinite`     | Test if both real and imag parts are finite.       |
|  ✅  | `isinf`        | Test if either real or imag part is infinite.      |
|  ✅  | `isnan`        | Test if either real or imag part is NaN.           |
|  ✅  | `log`          | Natural logarithm of complex number.               |
|  ✅  | `log10`        | Base-10 logarithm of complex number.               |
|  ✅  | `phase`        | Phase angle (argument) of complex number.          |
|  ✅  | `polar`        | Convert complex to polar coordinates (r, φ).       |
|  ✅  | `rect`         | Convert polar coordinates to complex number.       |
|  ✅  | `sin`          | Sine of complex number.                            |
|  ✅  | `sinh`         | Hyperbolic sine.                                   |
|  ✅  | `sqrt`         | Square root of complex number.                     |
|  ✅  | `tan`          | Tangent of complex number.                         |
|  ✅  | `tanh`         | Hyperbolic tangent.                                |

* Not yet implemented (no methods in `src/smalltalk/Python/cmath.gs`): the
  inverse trigonometric/hyperbolic functions (`acos`, `acosh`, `asin`,
  `asinh`, `atan`, `atanh`) and `isclose`.

## Notes

### Complex Number Representation
- Complex numbers are represented as `complex(real, imag)` where both parts are floats
- `real` and `imag` are stored as instance variables on `complex` and read
  through the `real` / `imag` accessors (`src/smalltalk/Python/complex.gs`)

### Constants
- `inf` and `nan` return Python float objects
- `infj` and `nanj` return complex numbers with infinity/NaN in the imaginary part
- Uses GemStone constants: `PlusInfinity`, `PlusQuietNaN`

### Polar Coordinates
- `polar(z)` returns a tuple `(r, φ)` where r is the magnitude and φ is the phase
- `rect(r, φ)` converts polar coordinates back to a complex number
- `phase(z)` returns just the phase angle φ

### Implementation Details
- All trigonometric functions use the standard complex formulas
- Logarithms handle the branch cut along the negative real axis
- Square root uses the principal branch

