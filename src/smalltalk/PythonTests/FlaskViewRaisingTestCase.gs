! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

! ------------------- Class definition for FlaskViewRaisingTestCase
expectvalue /Class
doit
PythonTestCase subclass: 'FlaskViewRaisingTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()

%

expectvalue /Class
doit
FlaskViewRaisingTestCase category: 'Grail-SUnit'
%

! ===============================================================================
! FlaskViewRaisingTestCase - a Flask view that raises answers 500 (#1221)
! ===============================================================================
! It used to END THE PROCESS.  Flask logs the exception through app.logger,
! whose default handler formats %(module)s; Grail's LogRecord had five fields,
! and the missing %(key)s was an uncatchable Smalltalk LookupError (#1220).
! Past that, werkzeug's InternalServerError took no keyword arguments, so
! Flask's InternalServerError(original_exception=e) raised a TypeError in place
! of the 500.  tests/python/flask_view_raising_answers_500.py holds the checks.
! ===============================================================================

set compile_env: 0

expectvalue /Metaclass3
doit
FlaskViewRaisingTestCase removeAllMethods.
FlaskViewRaisingTestCase class removeAllMethods.
%

set compile_env: 0

category: 'Grail-Setup'
method: FlaskViewRaisingTestCase
setUp

	importlib @env1:modules removeKey: #'flask_view_raising_answers_500' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/flask_view_raising_answers_500.py')
		name: 'flask_view_raising_answers_500'
%

category: 'Grail-Helpers'
method: FlaskViewRaisingTestCase
results

	^ testModule @env1:___pyAttrLoad___: #RESULTS
%

category: 'Grail-Helpers'
method: FlaskViewRaisingTestCase
assertAll: names

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]
%

category: 'Grail-Tests'
method: FlaskViewRaisingTestCase
testAViewThatRaisesAnswers500AndIsLogged
	"The view's own error is logged with its traceback, and the client gets 500."

	self assertAll: #('a_view_that_raises_answers_500'
		'the_exception_is_logged_with_its_traceback')
%

category: 'Grail-Tests'
method: FlaskViewRaisingTestCase
testTheServerKeepsServingAfterIt

	self assertAll: #('the_server_keeps_serving_after_it')
%

category: 'Grail-Tests'
method: FlaskViewRaisingTestCase
testFlaskFindsARootHandlerThroughTheLoggerChain
	"Flask walks .parent to decide whether to add its own handler; the chain used to stop at None."

	self assertAll: #('flask_installs_its_default_handler_when_nothing_handles_the_logger'
		'flask_does_not_add_its_handler_when_root_has_one')
%

category: 'Grail-Tests'
method: FlaskViewRaisingTestCase
testEveryFixtureCheckIsAssertedByATestHere
	"The lists above name 5 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 5
%
