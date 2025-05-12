! ------------------- Remove existing behavior from ImportTestCase
removeallmethods ImportTestCase
removeallclassmethods ImportTestCase
! ------------------- Class methods for ImportTestCase
! ------------------- Instance methods for ImportTestCase
category: 'other'
method: ImportTestCase
test_sys

	| pyString result |
	pyString :=  '
import sys
sys.is_stack_trampoline_active() == False
'.
	result := ModuleAst evaluate: pyString.
	self assert: result ___value.
%
