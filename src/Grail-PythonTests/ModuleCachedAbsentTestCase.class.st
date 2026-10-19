Class {
	#name : 'ModuleCachedAbsentTestCase',
	#superclass : 'PythonTestCase',
	#category : 'Grail-SUnit'
}

{ #category : 'Grail-Private' }
ModuleCachedAbsentTestCase >> aLoadedModule [
	"Any ordinary .py-backed module.  textwrap is small, has no imports of
	consequence and is already loaded by most runs."

	^ importlib
		loadModuleFromPath: (importlib grailDir , '/src/python/stdlib/textwrap.py')
		name: 'textwrap'

]

{ #category : 'Grail-Tests' }
ModuleCachedAbsentTestCase >> testCachedIsNotAnEntryInTheNamespace [
	"Not in the namespace either, so dir(), vars() and iteration do not list it
	-- matching a C module.  This is the half a later ``helpful'' change would
	break by stamping a fabricated __pycache__ path at import."

	| mod |
	mod := self aLoadedModule.
	self deny: (mod @env0:includesKey: #'__cached__')
		description: '__cached__ must not be an entry in the module namespace'.
	self deny: ((mod @env0:dynamicInstVarAt: #'__cached__') notNil)
		description: '__cached__ must not be stored as a dynamic instVar'.

]

{ #category : 'Grail-Tests' }
ModuleCachedAbsentTestCase >> testReadingCachedRaisesAttributeError [
	"An AttributeError, not None.  None is a DIFFERENT claim -- ``there is a
	cache slot and it is empty'' rather than ``there is no such attribute'' --
	and hasattr() has to be false to match a C-implemented CPython module.

	The error carries CPython's ``name'', so traceback.py's suggestion machinery
	and ``except AttributeError as e: if e.name == ...'' both work."

	| mod raised |
	mod := self aLoadedModule.
	raised := false.
	[mod @env1:___pyAttrLoad___: #'__cached__']
		@env0:on: (Python at: #'AttributeError')
		do: [:ex | raised := true. ex @env0:return: nil].
	self assert: raised description: 'reading __cached__ must raise AttributeError'.

]
