! ------------------- Remove existing behavior from MathTestCase
removeallmethods MathTestCase
removeallclassmethods MathTestCase
! ------------------- Class methods for MathTestCase
! ------------------- Instance methods for MathTestCase
category: 'other'
method: MathTestCase
test_comb

	| pyString result |
	pyString :=  '
import math
math.comb(3, 4) == 0
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.comb(4, 4) == 1
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.comb(4, 3) == 4
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.comb(4, 2) == 6
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.comb(4, 1) == 4
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.comb(4.0, 1)
'.
	result := false.
	[
		ModuleAst evaluate: pyString.
	] on: TypeError do: [:ex | 
		result := true.
	].
	self assert: result.

	pyString :=  '
import math
math.comb(4, 1.0)
'.
	result := false.
	[
		ModuleAst evaluate: pyString.
	] on: TypeError do: [:ex | 
		result := true.
	].
	self assert: result.

	pyString :=  '
import math
math.comb(-4, 1)
'.
	result := false.
	[
		ModuleAst evaluate: pyString.
	] on: ValueError do: [:ex | 
		result := true.
	].
	self assert: result.

	pyString :=  '
import math
math.comb(4, -1)
'.
	result := false.
	[
		ModuleAst evaluate: pyString.
	] on: ValueError do: [:ex | 
		result := true.
	].
	self assert: result.
%
category: 'other'
method: MathTestCase
test_factorial

	| pyString result |
	pyString :=  '
import math
math.factorial(5) == 120
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.factorial(-5)
'.
	result := false.
	[
		ModuleAst evaluate: pyString.
	] on: ValueError do: [:ex | 
		result := true.
	].
	self assert: result.

	pyString :=  '
import math
math.factorial(5.0)
'.
	result := false.
	[
		ModuleAst evaluate: pyString.
	] on: TypeError do: [:ex | 
		result := true.
	].
	self assert: result.

	pyString :=  '
import math
math.factorial()
'.
	result := false.
	[
		ModuleAst evaluate: pyString.
	] on: TypeError do: [:ex | 	"math.sqrt() takes exactly one argument (0 given)"
		result := true.
	].
	self assert: result.
%
category: 'other'
method: MathTestCase
test_gcd

	| pyString result |
	pyString :=  '
import math
math.gcd() == 0
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(4) == 4
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(12, 18) == 6
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(17, 5) == 1
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(10, 0) == 10
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(100, 10) == 10
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(1, 1) == 1
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(6, 12, 18) == 6
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(7, 14, 21) == 7
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(3, 5, 7) == 1
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(4, 6, 9) == 1
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(105, 140, 175, 210) == 35
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.gcd(105, 140.0, 175, 210) == 35
'.
	result := false.
	[
		ModuleAst evaluate: pyString.
	] on: TypeError do: [:ex | 
		result := true.
	].
	self assert: result.
%
category: 'other'
method: MathTestCase
test_isqrt

	| pyString result |
	pyString :=  '
import math
math.isqrt(4.0)
'.
	result := false.
	[
		ModuleAst evaluate: pyString.
	] on: TypeError do: [:ex | 
		result := true.
	].
	self assert: result.

	pyString :=  '
import math
math.isqrt(-4)
'.
	result := false.
	[
		ModuleAst evaluate: pyString.
	] on: ValueError do: [:ex | 
		result := true.
	].
	self assert: result.

	pyString :=  '
import math
math.isqrt(4) == 2
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.isqrt(5) == 2
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.

	pyString :=  '
import math
math.isqrt(8) == 2
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
