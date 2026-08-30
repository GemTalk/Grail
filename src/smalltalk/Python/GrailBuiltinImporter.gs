! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- GrailBuiltinImporter (the finder pinned at sys.meta_path[0])
expectvalue /Class
doit
object subclass: 'GrailBuiltinImporter'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
GrailBuiltinImporter comment:
'The finder Grail pins at ``sys.meta_path[0]'' -- its answer to CPython''s
BuiltinImporter, and the reason a user-installed finder cannot shadow Grail''s
own ``os'' or ``traceback''.

WHY IT EXISTS.  Grail now consults ``sys.meta_path'' (PEP 302/451) the way
CPython does: sys.modules cache, then every meta_path entry in order, then the
native filesystem search as the last entry -- CPython''s PathFinder. That
ordering is deliberate and was measured against CPython 3.14 first: a spy
finder inserted at sys.meta_path[0] there is never asked for ``os'' (already in
sys.modules at interpreter startup) but IS asked for ``json'', ``struct'',
``datetime'', ``threading'', ``io'' and ``weakref''. So CPython''s protection
for its own modules is NOT that meta_path comes late; it is the cache, plus
BuiltinImporter sitting at position 0 covering sys.builtin_module_names.

ONE DEVIATION, and it is the point of the class.  This finder is asked FIRST
whatever its index -- see importlib class >> ___findViaMetaPath___:.  Literal
position would not do: ``sys.meta_path.insert(0, f)'' is how everyone spells
``ask my finder first'', so a caller doing the ordinary thing would displace
Grail''s ``os'' and ``traceback'' without meaning to. CPython can afford literal
ordering because the modules it protects are compiled into the binary and its
cache is warm before user code runs; Grail''s stdlib is .py files on disk,
loaded lazily, and its own runtime reads them at moments no user code chose.

WHAT IT CLAIMS.  Exactly the modules GRAIL ITSELF SHIPS: anything resolvable
under ``importlib class >> ___grailOwnRoots___'' -- the checkout and its ported
stdlib at src/python/stdlib. Not extraSearchRoots, not sys.path: those roots
were added by the caller, and a caller who added a tree is entitled to have a
finder serve out of it. That boundary is the same one
``___moduleNameToPath___:'' has always drawn, now stated as a finder instead of
as a search order.

Grail''s own tree is the right analogue of CPython''s builtin + frozen set
because Grail''s RUNTIME imports out of it at moments no user code chose:
warnings imports ``linecache'' and ``re'' while formatting a warning,
PyEnumTypes imports ``inspect'' from inside a class body, CPythonShim imports
``contextvars'' when a coroutine crosses the shim boundary. A finder that
answered any of those would be running user code inside Grail''s own error and
class-construction paths. (A private, meta_path-free entry point for those four
callers was the other candidate fix; it would protect the runtime but would
leave a plain ``import traceback'' in user code shadowable, which is the case
the pinned finder also covers.)

HOW IT IS CALLED.  Ordinary imports never reach the Python methods below:
``importlib class >> ___askFinder___:for:path:'' recognises this class and does
the same resolution in Smalltalk. It has to -- answering ``find_spec'' means
building a ModuleSpec, and the only ModuleSpec Grail has is in the Python-side
importlib facade, so answering would mean performing an import from inside the
import machinery on the first cold import of a session. The methods here are
real and answer the same thing; they exist so that ``sys.meta_path[0]'' is a
genuine PEP 451 finder to anything that introspects or calls it.

REMOVING IT is allowed and is the whole opt-out: take this object out of
sys.meta_path and nothing is privileged any more -- a finder can then shadow
Grail''s stdlib. CPython behaves the same way if you delete BuiltinImporter.
Re-ordering the list does NOT opt out, deliberately; removal is explicit and an
insert is not.
'
%

expectvalue /Class
doit
GrailBuiltinImporter category: 'Grail-Import'
%

! ------------------- Remove existing methods
expectvalue /Metaclass3
doit
GrailBuiltinImporter removeAllMethods.
GrailBuiltinImporter class removeAllMethods.
GrailBuiltinImporter removeAllMethods: 1.
GrailBuiltinImporter class removeAllMethods: 1.
%

set compile_env: 0

category: 'Grail-Import'
method: GrailBuiltinImporter
___grailPathFor___: aName
	"The source path for aName if Grail ships it, else nil.  One place, so the
	finder and the loader halves cannot drift apart."

	(aName isKindOf: CharacterCollection) ifFalse: [^ nil].
	"___grailOwnedPathFor___: is an env-1 classmethod (it sits in importlib.gs's
	env-1 region beside ___moduleNameToPath___:), so the send names its
	environment explicitly from this env-0 method."
	^ importlib @env1:___grailOwnedPathFor___: aName asString
%

category: 'Grail-Import'
method: GrailBuiltinImporter
___pySpecFor___: aName
	"A ModuleSpec for aName, or nil.  Built from the Python-side importlib
	facade's _ModuleSpec (the class ``importlib.machinery.ModuleSpec'' is
	exported as), because that is the spec object every other Grail path
	produces and third-party code compares against."

	| path pyImportlib specClass search |
	path := self ___grailPathFor___: aName.
	path isNil ifTrue: [^ nil].
	pyImportlib := (importlib ___instance___) @env1:import_module: 'importlib'.
	specClass := pyImportlib @env1:___pyAttrLoad___: #'_ModuleSpec'.
	"A package's spec is marked by having submodule_search_locations at all;
	CPython uses the __init__.py's own directory as the single portion."
	search := (path endsWith: '/__init__.py')
		ifTrue: [Array with: (path copyFrom: 1 to: path size - 12)]
		ifFalse: [None].
	^ specClass @env1:value: { aName asString. self. path. search } value: nil
%

set compile_env: 1

category: 'Grail-Import'
method: GrailBuiltinImporter
find_spec: aName _: aPath
	"PEP 451 find_spec(fullname, path).  A spec when Grail ships the module,
	None otherwise -- ``None'' meaning ``I decline, ask the next finder''."

	^ (self @env0:___pySpecFor___: aName) ifNil: [None]
%

category: 'Grail-Import'
method: GrailBuiltinImporter
find_spec: aName _: aPath _: aTarget
	"PEP 451 find_spec(fullname, path, target).  ``target'' is the module a
	RELOAD is re-using, which this finder has no use for: it always produces the
	same spec for a given name."

	^ self find_spec: aName _: aPath
%

category: 'Grail-Import'
method: GrailBuiltinImporter
find_module: aName
	"PEP 302 find_module(fullname).  Deprecated upstream and removed in CPython
	3.12, kept because a finder is also asked this way by older third-party
	code; answers the LOADER, which for this class is itself."

	^ self find_module: aName _: None
%

category: 'Grail-Import'
method: GrailBuiltinImporter
find_module: aName _: aPath
	"PEP 302 find_module(fullname, path) -- self when Grail ships the module."

	^ (self @env0:___grailPathFor___: aName) isNil ifTrue: [None] ifFalse: [self]
%

category: 'Grail-Import'
method: GrailBuiltinImporter
load_module: aName
	"PEP 302 load_module(fullname): build the module and register it.  Routes
	straight into Grail's native loader, which is what makes this finder's
	answer identical to the one the filesystem search would have given."

	| path |
	path := self @env0:___grailPathFor___: aName.
	path isNil ifTrue: [
		^ ImportError ___signal___:
			('GrailBuiltinImporter does not serve ' @env0:, aName @env0:printString)].
	^ importlib @env0:loadModuleFromPath: path name: aName @env0:asString
%

category: 'Grail-Import'
method: GrailBuiltinImporter
create_module: aSpec
	"PEP 451 create_module(spec).  Grail's loader compiles a module class and
	mints its instance in one step, so the module is BUILT here and exec_module
	has nothing left to do -- the shape six's own importer uses."

	^ self load_module: (aSpec @env1:___pyAttrLoad___: #'name')
%

category: 'Grail-Import'
method: GrailBuiltinImporter
exec_module: aModule
	"PEP 451 exec_module(module).  A no-op: create_module already ran the
	module body, because Grail's loader does not separate the two."

	^ None
%

category: 'Grail-Import'
method: GrailBuiltinImporter
is_package: aName
	"True when the module Grail ships for aName is a package -- its source is an
	__init__.py."

	| path |
	path := self @env0:___grailPathFor___: aName.
	path isNil ifTrue: [
		^ ImportError ___signal___:
			('GrailBuiltinImporter does not serve ' @env0:, aName @env0:printString)].
	^ path @env0:endsWith: '__init__.py'
%

category: 'Grail-Import'
method: GrailBuiltinImporter
get_source: aName
	"InspectLoader.get_source(fullname) -- delegated to PySourceFileLoader,
	which already implements reading a module's source off disk."

	| path |
	path := self @env0:___grailPathFor___: aName.
	path isNil ifTrue: [
		^ ImportError ___signal___:
			('GrailBuiltinImporter does not serve ' @env0:, aName @env0:printString)].
	^ (PySourceFileLoader @env0:name: aName @env0:asString path: path) get_source: aName
%

category: 'Grail-Import'
method: GrailBuiltinImporter
get_code: aName
	"InspectLoader.get_code(fullname).  None: Grail compiles to GemStone
	methods and has no code object to hand back, and None is the documented
	answer for ``this loader has no code object for it''."

	self is_package: aName.
	^ None
%

category: 'Grail-Import'
method: GrailBuiltinImporter
invalidate_caches
	"PathEntryFinder.invalidate_caches().  Nothing is cached: every probe
	re-reads the filesystem."

	^ None
%

category: 'Grail-String Representation'
method: GrailBuiltinImporter
__repr__
	"Named rather than addressed, because this object's whole job is to be
	recognisable at sys.meta_path[0]."

	^ '<GrailBuiltinImporter (Grail''s own stdlib)>'
%

set compile_env: 0
