! ------------------- Remove existing behavior from TranslatorTestCase
removeAllMethods TranslatorTestCase
removeAllClassMethods TranslatorTestCase
! ------------------- Class methods for TranslatorTestCase
set compile_env: 0
category: 'other'
classmethod: TranslatorTestCase
filename

	self subclassResponsibility
%
! ------------------- Instance methods for TranslatorTestCase
set compile_env: 0
