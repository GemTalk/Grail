! ------------------- Remove existing behavior from CMathTestCase
removeallmethods CMathTestCase
removeallclassmethods CMathTestCase
! ------------------- Class methods for CMathTestCase
! ------------------- Instance methods for CMathTestCase
category: 'other'
method: CMathTestCase
setUp

	scope := Variables new.
	cmathModule := (Python at: #cmath) new.
%
category: 'other'
method: CMathTestCase
test_asin_acos

	| asinResult acosResult |

	"Test asin(0) = 0"
	asinResult := cmathModule asin scope: scope positional: {int ___value: 0} named: {}.
	self assert: asinResult ___real abs < 0.0001.
	self assert: asinResult ___imaginary abs < 0.0001.

	"Test acos(1) = 0"
	acosResult := cmathModule acos scope: scope positional: {int ___value: 1} named: {}.
	self assert: acosResult ___real abs < 0.0001.
	self assert: acosResult ___imaginary abs < 0.0001.

	"Test asin(1) = pi/2"
	asinResult := cmathModule asin scope: scope positional: {int ___value: 1} named: {}.
	self assert: (asinResult ___real - (Float pi / 2)) abs < 0.0001.
	self assert: asinResult ___imaginary abs < 0.0001.
%
category: 'other'
method: CMathTestCase
test_asinh_acosh_atanh

	| asinhResult acoshResult atanhResult |

	"Test asinh(0) = 0"
	asinhResult := cmathModule asinh scope: scope positional: {int ___value: 0} named: {}.
	self assert: asinhResult ___real abs < 0.0001.
	self assert: asinhResult ___imaginary abs < 0.0001.

	"Test acosh(1) = 0"
	acoshResult := cmathModule acosh scope: scope positional: {int ___value: 1} named: {}.
	self assert: acoshResult ___real abs < 0.0001.
	self assert: acoshResult ___imaginary abs < 0.0001.

	"Test atanh(0) = 0"
	atanhResult := cmathModule atanh scope: scope positional: {int ___value: 0} named: {}.
	self assert: atanhResult ___real abs < 0.0001.
	self assert: atanhResult ___imaginary abs < 0.0001.
%
category: 'other'
method: CMathTestCase
test_atan

	| result |

	"Test atan(0) = 0"
	result := cmathModule atan scope: scope positional: {int ___value: 0} named: {}.
	self assert: result ___real abs < 0.0001.
	self assert: result ___imaginary abs < 0.0001.

	"Test atan(i) should give a complex result"
	result := cmathModule atan scope: scope positional: {complex ___real: 0 imaginary: 1} named: {}.
	"atan(i) = i*infinity (has a singularity), but we just check it returns a complex number"
	self assert: (result isKindOf: complex).
%
category: 'other'
method: CMathTestCase
test_constants

	self
		assert: (cmathModule pi) ___value equals: Float pi;
		assert: (cmathModule e) ___value equals: Float e;
		assert: (cmathModule tau) ___value equals: Float pi * 2.0;
		yourself.
%
category: 'other'
method: CMathTestCase
test_exp

	| result |

	"Test exp(0) = 1"
	result := cmathModule exp scope: scope positional: {int ___value: 0} named: {}.
	self assert: (result ___real - 1.0) abs < 0.0001.
	self assert: result ___imaginary abs < 0.0001.

	"Test exp(i*pi) = -1 (Euler's formula)"
	result := cmathModule exp scope: scope positional: {complex ___real: 0 imaginary: Float pi} named: {}.
	self assert: (result ___real - (-1.0)) abs < 0.0001.
	self assert: result ___imaginary abs < 0.0001.
%
category: 'other'
method: CMathTestCase
test_inverse_roundtrip

	| z sinZ asinResult cosZ acosResult |

	"Test that asin(sin(z)) ≈ z for a simple value"
	z := complex ___real: 0.5 imaginary: 0.3.

	sinZ := cmathModule sin scope: scope positional: {z} named: {}.
	asinResult := cmathModule asin scope: scope positional: {sinZ} named: {}.

	self assert: (asinResult ___real - z ___real) abs < 0.001.
	self assert: (asinResult ___imaginary - z ___imaginary) abs < 0.001.

	"Test that acos(cos(z)) ≈ z for a simple value"
	cosZ := cmathModule cos scope: scope positional: {z} named: {}.
	acosResult := cmathModule acos scope: scope positional: {cosZ} named: {}.

	self assert: (acosResult ___real - z ___real) abs < 0.001.
	self assert: (acosResult ___imaginary - z ___imaginary) abs < 0.001.
%
category: 'other'
method: CMathTestCase
test_isfinite

	self
		assert: (cmathModule isfinite scope: scope positional: {complex ___real: 1.0 imaginary: 2.0} named: {}) ___value;
		deny: (cmathModule isfinite scope: scope positional: {complex ___real: PlusInfinity imaginary: 0.0} named: {}) ___value;
		deny: (cmathModule isfinite scope: scope positional: {complex ___real: 0.0 imaginary: PlusInfinity} named: {}) ___value;
		yourself.
%
category: 'other'
method: CMathTestCase
test_isinf

	self
		deny: (cmathModule isinf scope: scope positional: {complex ___real: 1.0 imaginary: 2.0} named: {}) ___value;
		assert: (cmathModule isinf scope: scope positional: {complex ___real: PlusInfinity imaginary: 0.0} named: {}) ___value;
		assert: (cmathModule isinf scope: scope positional: {complex ___real: 0.0 imaginary: PlusInfinity} named: {}) ___value;
		yourself.
%
category: 'other'
method: CMathTestCase
test_isnan

	self
		deny: (cmathModule isnan scope: scope positional: {complex ___real: 1.0 imaginary: 2.0} named: {}) ___value;
		assert: (cmathModule isnan scope: scope positional: {complex ___real: PlusQuietNaN imaginary: 0.0} named: {}) ___value;
		assert: (cmathModule isnan scope: scope positional: {complex ___real: 0.0 imaginary: PlusQuietNaN} named: {}) ___value;
		yourself.
%
category: 'other'
method: CMathTestCase
test_log

	| result |

	"Test log(e) = 1"
	result := cmathModule log scope: scope positional: {float ___value: Float e} named: {}.
	self assert: (result ___real - 1.0) abs < 0.0001.
	self assert: result ___imaginary abs < 0.0001.

	"Test log(-1) = i*pi"
	result := cmathModule log scope: scope positional: {int ___value: -1} named: {}.
	self assert: result ___real abs < 0.0001.
	self assert: (result ___imaginary - Float pi) abs < 0.0001.
%
category: 'other'
method: CMathTestCase
test_phase

	| result |

	"Test phase(1) = 0"
	result := cmathModule phase scope: scope positional: {int ___value: 1} named: {}.
	self assert: result ___value abs < 0.0001.

	"Test phase(-1) = pi"
	result := cmathModule phase scope: scope positional: {int ___value: -1} named: {}.
	self assert: (result ___value abs - Float pi) abs < 0.0001.

	"Test phase(i) = pi/2"
	result := cmathModule phase scope: scope positional: {complex ___real: 0 imaginary: 1} named: {}.
	self assert: (result ___value - (Float pi / 2)) abs < 0.0001.
%
category: 'other'
method: CMathTestCase
test_polar

	| result r phi |

	"Test polar(1+i)"
	result := cmathModule polar scope: scope positional: {complex ___real: 1 imaginary: 1} named: {}.
	r := result ___value at: 1.
	phi := result ___value at: 2.

	self assert: (r ___value - 2.0 sqrt) abs < 0.0001.
	self assert: (phi ___value - (Float pi / 4)) abs < 0.0001.
%
category: 'other'
method: CMathTestCase
test_rect

	| result |

	"Test rect(sqrt(2), pi/4) = 1+i"
	result := cmathModule rect scope: scope positional: {float ___value: 2.0 sqrt. float ___value: Float pi / 4} named: {}.

	self assert: (result ___real - 1.0) abs < 0.0001.
	self assert: (result ___imaginary - 1.0) abs < 0.0001.
%
category: 'other'
method: CMathTestCase
test_sin_cos

	| sinResult cosResult |

	"Test sin(0) = 0"
	sinResult := cmathModule sin scope: scope positional: {int ___value: 0} named: {}.
	self assert: sinResult ___real abs < 0.0001.
	self assert: sinResult ___imaginary abs < 0.0001.

	"Test cos(0) = 1"
	cosResult := cmathModule cos scope: scope positional: {int ___value: 0} named: {}.
	self assert: (cosResult ___real - 1.0) abs < 0.0001.
	self assert: cosResult ___imaginary abs < 0.0001.
%
category: 'other'
method: CMathTestCase
test_sqrt

	| result |

	"Test sqrt(4) = 2"
	result := cmathModule sqrt scope: scope positional: {int ___value: 4} named: {}.
	self assert: (result ___real - 2.0) abs < 0.0001.
	self assert: result ___imaginary abs < 0.0001.

	"Test sqrt(-1) = i"
	result := cmathModule sqrt scope: scope positional: {int ___value: -1} named: {}.
	self assert: result ___real abs < 0.0001.
	self assert: (result ___imaginary - 1.0) abs < 0.0001.
%
