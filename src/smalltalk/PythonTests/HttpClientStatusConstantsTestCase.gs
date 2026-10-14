! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for HttpClientStatusConstantsTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'HttpClientStatusConstantsTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
HttpClientStatusConstantsTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! HttpClientStatusConstantsTestCase - http.client status constants, responses
! ===============================================================================
! CPython's http.client makes every http.HTTPStatus member a module constant
! (http.client.OK) and maps every status in ``responses''.  Grail's had no
! constants and a 35-code responses, so google-auth's tests, which read
! http_client.OK and a dozen more, failed to collect.
! tests/python/http_client_status_constants.py holds the 5 checks.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
HttpClientStatusConstantsTestCase removeAllMethods.
HttpClientStatusConstantsTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: HttpClientStatusConstantsTestCase
setUp

	importlib @env1:modules removeKey: #'http_client_status_constants' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/http_client_status_constants.py')
		name: 'http_client_status_constants'
%

category: 'Grail-Helpers'
method: HttpClientStatusConstantsTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: HttpClientStatusConstantsTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests - status'
method: HttpClientStatusConstantsTestCase
testEveryStatusIsAModuleConstant

	self assertAll: #('google_auths_constants' 'a_constant_is_the_status_member'
		'every_member_is_a_module_constant')
%

category: 'Grail-Tests - status'
method: HttpClientStatusConstantsTestCase
testResponsesNamesEveryStatus

	self assertAll: #('responses_names_every_status' 'responses_maps_a_code_to_its_phrase')
%

category: 'Grail-Tests - status'
method: HttpClientStatusConstantsTestCase
testEveryFixtureCheckIsAssertedByATestHere

	self assert: (self results @env1:__len__) equals: 5
%
