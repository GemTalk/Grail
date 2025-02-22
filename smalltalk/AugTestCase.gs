! ------------------- Remove existing behavior from AugTestCase
removeallmethods AugTestCase
removeallclassmethods AugTestCase
! ------------------- Class methods for AugTestCase
category: 'other'
classmethod: AugTestCase
filename

	^nil
%
! ------------------- Instance methods for AugTestCase
category: 'other'
method: AugTestCase
testAugmentedAssignment

	| pyString result |
	pyString :=  
'x = 10
x += 5
x == 15'.
	result := ModuleAst evaluate: pyString. 
	self assert: result ___value.
	"

x = 10
x += 5   # Equivalent to: x = x + 5
print(x)  # Output: 15

y = 20
y -= 3   # Equivalent to: y = y - 3
print(y)  # Output: 17

z = 4
z *= 2   # Equivalent to: z = z * 2
print(z)  # Output: 8

a = 10
a /= 2   # Equivalent to: a = a / 2
print(a)  # Output: 5.0

b = 10
b //= 3  # Equivalent to: b = b // 3
print(b)  # Output: 3

c = 5
c **= 2  # Equivalent to: c = c ** 2
print(c)  # Output: 25

d = 10
d %= 3   # Equivalent to: d = d % 3
print(d)  # Output: 1
"
%
