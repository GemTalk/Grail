Class {
	#name : 'ClassBodyConditionalNewTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests - class body' }
ClassBodyConditionalNewTestCase >> testEveryConditionalNewCheckAgreesWithCPython [
	"Every check in tests/python/class_body_conditional_new.py, which the
	fixture gate also runs under CPython 3.14.

	The names are listed rather than iterated so that a check DISAPPEARING
	fails too -- a fixture that stopped defining checks would otherwise pass
	this test with an empty loop."

	| fixture results names |

	importlib @env1:modules removeKey: #'class_body_conditional_new' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/class_body_conditional_new.py')
		name: 'class_body_conditional_new'.
	results := fixture @env1:___pyAttrLoad___: #RESULTS.
	names := #('a_conditional_init_still_works'
	  'a_conditional_new_builds_the_instance'
	  'a_conditional_new_that_refuses_refuses'
	  'a_conditional_rebind_of_a_class_attribute_still_wins'
	  'a_new_in_the_else_branch_is_used'
	  'an_unconditional_new_still_works'
	  'assigning_new_after_the_class_exists_still_works').
	names do: [:name |
		self
			assert: ((results @env1:__getitem__: name) = true)
			description: name , ' -> ' , (results @env1:__getitem__: name) printString].
	self assert: names size equals: 7

]
