Extension { #name : 'GrailBuiltinImporter' }

{ #category : 'Grail-String Representation' }
GrailBuiltinImporter >> __repr__ [
	"Named rather than addressed, because this object's whole job is to be
	recognisable at sys.meta_path[0]."

	^ '<GrailBuiltinImporter (Grail''s own stdlib)>'

]

{ #category : 'Grail-Import' }
GrailBuiltinImporter >> create_module: aSpec [
	"PEP 451 create_module(spec).  Grail's loader compiles a module class and
	mints its instance in one step, so the module is BUILT here and exec_module
	has nothing left to do -- the shape six's own importer uses."

	^ self load_module: (aSpec @env1:___pyAttrLoad___: #'name')

]

{ #category : 'Grail-Import' }
GrailBuiltinImporter >> exec_module: aModule [
	"PEP 451 exec_module(module).  A no-op: create_module already ran the
	module body, because Grail's loader does not separate the two."

	^ None

]

{ #category : 'Grail-Import' }
GrailBuiltinImporter >> find_module: aName [
	"PEP 302 find_module(fullname).  Deprecated upstream and removed in CPython
	3.12, kept because a finder is also asked this way by older third-party
	code; answers the LOADER, which for this class is itself."

	^ self find_module: aName _: None

]

{ #category : 'Grail-Import' }
GrailBuiltinImporter >> find_module: aName _: aPath [
	"PEP 302 find_module(fullname, path) -- self when Grail ships the module."

	^ (self @env0:___grailPathFor___: aName) isNil ifTrue: [None] ifFalse: [self]

]

{ #category : 'Grail-Import' }
GrailBuiltinImporter >> find_spec: aName _: aPath [
	"PEP 451 find_spec(fullname, path).  A spec when Grail ships the module,
	None otherwise -- ``None'' meaning ``I decline, ask the next finder''."

	^ (self @env0:___pySpecFor___: aName) ifNil: [None]

]

{ #category : 'Grail-Import' }
GrailBuiltinImporter >> find_spec: aName _: aPath _: aTarget [
	"PEP 451 find_spec(fullname, path, target).  ``target'' is the module a
	RELOAD is re-using, which this finder has no use for: it always produces the
	same spec for a given name."

	^ self find_spec: aName _: aPath

]

{ #category : 'Grail-Import' }
GrailBuiltinImporter >> get_code: aName [
	"InspectLoader.get_code(fullname).  None: Grail compiles to GemStone
	methods and has no code object to hand back, and None is the documented
	answer for ``this loader has no code object for it''."

	self is_package: aName.
	^ None

]

{ #category : 'Grail-Import' }
GrailBuiltinImporter >> get_source: aName [
	"InspectLoader.get_source(fullname) -- delegated to PySourceFileLoader,
	which already implements reading a module's source off disk."

	| path |
	path := self @env0:___grailPathFor___: aName.
	path isNil ifTrue: [
		^ ImportError ___signal___:
			('GrailBuiltinImporter does not serve ' @env0:, aName @env0:printString)].
	^ (PySourceFileLoader @env0:name: aName @env0:asString path: path) get_source: aName

]

{ #category : 'Grail-Import' }
GrailBuiltinImporter >> invalidate_caches [
	"PathEntryFinder.invalidate_caches().  Nothing is cached: every probe
	re-reads the filesystem."

	^ None

]

{ #category : 'Grail-Import' }
GrailBuiltinImporter >> is_package: aName [
	"True when the module Grail ships for aName is a package -- its source is an
	__init__.py."

	| path |
	path := self @env0:___grailPathFor___: aName.
	path isNil ifTrue: [
		^ ImportError ___signal___:
			('GrailBuiltinImporter does not serve ' @env0:, aName @env0:printString)].
	^ path @env0:endsWith: '__init__.py'

]

{ #category : 'Grail-Import' }
GrailBuiltinImporter >> load_module: aName [
	"PEP 302 load_module(fullname): build the module and register it.  Routes
	straight into Grail's native loader, which is what makes this finder's
	answer identical to the one the filesystem search would have given."

	| path |
	path := self @env0:___grailPathFor___: aName.
	path isNil ifTrue: [
		^ ImportError ___signal___:
			('GrailBuiltinImporter does not serve ' @env0:, aName @env0:printString)].
	^ importlib @env0:loadModuleFromPath: path name: aName @env0:asString

]
