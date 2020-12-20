! ------------------- Remove existing behavior from ImportTestCase
removeAllMethods ImportTestCase
removeAllClassMethods ImportTestCase
! ------------------- Class methods for ImportTestCase
set compile_env: 0
category: 'other'
classmethod: ImportTestCase
filename

	^'Import.py'
%
! ------------------- Instance methods for ImportTestCase
set compile_env: 0
category: 'other'
method: ImportTestCase
tst_importlib

	(self statementsAt: 1) evaluate: aScope.
	self halt.
%
