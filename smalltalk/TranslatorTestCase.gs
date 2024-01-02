! ------------------- Remove existing behavior from TranslatorTestCase
expectvalue /Metaclass3
doit
TranslatorTestCase removeAllMethods.
TranslatorTestCase class removeAllMethods.
%
! ------------------- Class methods for TranslatorTestCase
set compile_env: 0
category: 'other'
classmethod: TranslatorTestCase
filename

	self subclassResponsibility
%
! ------------------- Instance methods for TranslatorTestCase
