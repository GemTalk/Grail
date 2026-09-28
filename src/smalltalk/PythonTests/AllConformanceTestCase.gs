! ------------------- Superclass check
run
PythonTestCase ifNil: [self error: 'PythonTestCase is not defined. Check file ordering.'].
%

expectvalue /Class
doit
PythonTestCase subclass: 'AllConformanceTestCase'
  instVarNames: #( testModule)
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: PythonTests
  options: #()
%

expectvalue /Class
doit
AllConformanceTestCase comment:
'The runtime gaps test___all__ ran into, one check per gap -- see
tests/python/all_conformance.py, whose expected values were produced by
running it under CPython 3.14.6:

  a class-body name only a bare annotation mentions, resolved against the
  class (ClassDefAst.gs); the escape for the other quote character keeping
  its backslash (PythonTokenizer.gs); a star import in exec() binding only
  what a literal __all__ spelled out (ImportFromAst.gs, builtins.gs).

testANotificationDoesNotAbandonAModuleBody pins the fourth, which Python
cannot reach: importlib took a resumable Notification in a module body for a
failed import and abandoned the body in silence (importlib.gs).'
%

expectvalue /Class
doit
AllConformanceTestCase category: 'Grail-SUnit'
%

expectvalue /Metaclass3
doit
AllConformanceTestCase removeAllMethods: 0.
AllConformanceTestCase class removeAllMethods: 0.
%

set compile_env: 0

category: 'Grail-Setup'
method: AllConformanceTestCase
setUp
	| mods |
	mods := importlib @env1:modules.
	mods removeKey: #'all_conformance' ifAbsent: [].
	testModule := importlib
		loadModuleFromPath: (importlib grailDir , '/tests/python/all_conformance.py')
		name: 'all_conformance'.
%

category: 'Grail-Helpers'
method: AllConformanceTestCase
assertAll: keys
	keys do: [:each |
		| v |
		v := (testModule @env1:___pyAttrLoad___: #RESULTS) @env1:__getitem__: each.
		self assert: v == true description: each , ' -> ' , v printString]
%

category: 'Grail-Tests'
method: AllConformanceTestCase
testBareAnnotationIsNotAClassAttribute
	self assertAll: #('bare_annotation_is_not_a_class_attribute')
%

category: 'Grail-Tests'
method: AllConformanceTestCase
testBothQuoteEscapesDecode
	self assertAll: #('both_quote_escapes_decode')
%

category: 'Grail-Tests'
method: AllConformanceTestCase
testExecStarImport
	self assertAll: #('exec_star_honours_a_computed_all'
		'exec_star_imports_a_listed_submodule'
		'exec_star_without_all_takes_public_names'
		'exec_star_names_are_readable_in_the_same_exec')
%

category: 'Grail-Tests'
method: AllConformanceTestCase
testANotificationDoesNotAbandonAModuleBody
	"A resumable Notification signalled while a module body runs -- as
	AlmostOutOfMemory is, whenever temporary memory runs low -- must leave the
	body running.  The load's failure handler used to unload the module and
	``outer'' it; the resumption fell off the end of the handler, so the body
	was abandoned and the import reported success with nothing after the
	signal executed."

	| sysModule path file module |
	sysModule := (Python at: #sys) @env1:instance.
	sysModule @env1:__setattr__: 'grail_notification_probe'
		_: [:positional :kwargs | Notification new signal: 'probe'. nil].
	path := importlib grailTmpDir , '/grail_notification_probe_mod.py'.
	file := GsFile openWriteOnServer: path.
	file nextPutAll: 'import sys'; lf;
		nextPutAll: 'sys.grail_notification_probe()'; lf;
		nextPutAll: 'REACHED = True'; lf.
	file close.
	[(importlib @env1:modules) removeKey: #'grail_notification_probe_mod' ifAbsent: [].
	 "Resumed out here, as its default action would: SUnit's own handler
	 reports any Notification that reaches it as an error.  With the loader
	 passing it on, this is where it lands and the body carries on; without,
	 the loader has already abandoned the body by the time it arrives."
	 module := [importlib loadModuleFromPath: path name: 'grail_notification_probe_mod']
		on: Notification do: [:n | n resume: nil].
	 self assert: ((importlib @env1:modules) includesKey: #'grail_notification_probe_mod').
	 self assert: (module @env1:___pyAttrLoad___: #REACHED) == true]
		ensure: [
			(importlib @env1:modules) removeKey: #'grail_notification_probe_mod' ifAbsent: [].
			GsFile removeServerFile: path.
			sysModule @env1:__delattr__: 'grail_notification_probe']
%
