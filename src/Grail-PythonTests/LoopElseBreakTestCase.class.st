Class {
	#name : 'LoopElseBreakTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Tests' }
LoopElseBreakTestCase >> testABreakInALoopsElseClauseLeavesTheEnclosingLoop [
	"tests/python/loop_else_break.py: a break or continue in a for-else or
	while-else clause belongs to the loop around it; a break in the body
	still skips the else clause, a drain still runs it, and a return in it
	returns.  Each check agrees with CPython 3.14.  The break used to be
	caught by the loop that had already ended, so the enclosing loop went on
	-- graphlib's prepare() never returned."

	| fixture |
	importlib @env1:modules removeKey: #'loop_else_break' ifAbsent: [].
	fixture := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/loop_else_break.py')
		name: 'loop_else_break'.
	self
		assert: (fixture @env1:___pyAttrLoad___: #SUMMARY) asString
		equals: '7 checks, 0 disagreeing [], keys match: True'

]
