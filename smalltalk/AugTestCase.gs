! ------------------- Remove existing behavior from AugTestCase
removeallmethods AugTestCase
removeallclassmethods AugTestCase
! ------------------- Class methods for AugTestCase
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

	pyString :=  
'x = 20
x -= 3
x == 17'.
	result := ModuleAst evaluate: pyString. 
	self assert: result ___value.

	pyString :=  
'x = 4
x *= 2
x == 8'.
	result := ModuleAst evaluate: pyString. 
	self assert: result ___value.

	pyString :=  
'x = 10
x /= 2
x == 5'.
	result := ModuleAst evaluate: pyString. 
	self assert: result ___value.

	pyString :=  
'x = 10
x //= 3
x == 3'.
	result := ModuleAst evaluate: pyString. 
	self assert: result ___value.

	pyString :=  
'x = 5
x **= 2
x == 25'.
	result := ModuleAst evaluate: pyString. 
	self assert: result ___value.

	pyString :=  
'x = 10
x %= 3
x == 1'.
	result := ModuleAst evaluate: pyString. 
	self assert: result ___value.
%
