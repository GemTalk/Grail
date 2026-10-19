Class {
	#name : 'FlaskViewRaisingTestCase',
	#superclass : 'PythonTestCase',
	#instVars : [
		'testModule'
	],
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Helpers' }
FlaskViewRaisingTestCase >> assertAll: names [

	names do: [:name | | result |
		result := self results @env1:__getitem__: name.
		self assert: result == true description: name , ' -> ' , result printString]

]

{ #category : 'Grail-Helpers' }
FlaskViewRaisingTestCase >> results [

	^ testModule @env1:___pyAttrLoad___: #RESULTS

]

{ #category : 'Grail-Setup' }
FlaskViewRaisingTestCase >> setUp [

	importlib @env1:modules removeKey: #'flask_view_raising_answers_500' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/flask_view_raising_answers_500.py')
		name: 'flask_view_raising_answers_500'

]

{ #category : 'Grail-Tests' }
FlaskViewRaisingTestCase >> testAViewThatRaisesAnswers500AndIsLogged [
	"The view's own error is logged with its traceback, and the client gets 500."

	self assertAll: #('a_view_that_raises_answers_500'
		'the_exception_is_logged_with_its_traceback')

]

{ #category : 'Grail-Tests' }
FlaskViewRaisingTestCase >> testEveryFixtureCheckIsAssertedByATestHere [
	"The lists above name 5 checks.  A check added to the fixture without
	being listed would pass unasserted here, so the count is pinned."

	self assert: (self results @env1:__len__) equals: 5

]

{ #category : 'Grail-Tests' }
FlaskViewRaisingTestCase >> testFlaskFindsARootHandlerThroughTheLoggerChain [
	"Flask walks .parent to decide whether to add its own handler; the chain used to stop at None."

	self assertAll: #('flask_installs_its_default_handler_when_nothing_handles_the_logger'
		'flask_does_not_add_its_handler_when_root_has_one')

]

{ #category : 'Grail-Tests' }
FlaskViewRaisingTestCase >> testTheServerKeepsServingAfterIt [

	self assertAll: #('the_server_keeps_serving_after_it')

]
