! ------------------- Remove existing behavior from ImportTestCase
expectvalue /Metaclass3       
doit
ImportTestCase removeAllMethods.
ImportTestCase class removeAllMethods.
%
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
test_importlib

	"(self statementsAt: 1) evaluate."
%
