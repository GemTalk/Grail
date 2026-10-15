"The finder Grail pins at ``sys.meta_path[0]' -- its answer to CPython's
BuiltinImporter, and the reason a user-installed finder cannot shadow Grail's
own ``os' or ``traceback'.

WHY IT EXISTS.  Grail now consults ``sys.meta_path' (PEP 302/451) the way
CPython does: sys.modules cache, then every meta_path entry in order, then the
native filesystem search as the last entry -- CPython's PathFinder. That
ordering is deliberate and was measured against CPython 3.14 first: a spy
finder inserted at sys.meta_path[0] there is never asked for ``os' (already in
sys.modules at interpreter startup) but IS asked for ``json', ``struct',
``datetime', ``threading', ``io' and ``weakref'. So CPython's protection
for its own modules is NOT that meta_path comes late; it is the cache, plus
BuiltinImporter sitting at position 0 covering sys.builtin_module_names.

ONE DEVIATION, and it is the point of the class.  This finder is asked FIRST
whatever its index -- see importlib class >> ___findViaMetaPath___:.  Literal
position would not do: ``sys.meta_path.insert(0, f)' is how everyone spells
``ask my finder first', so a caller doing the ordinary thing would displace
Grail's ``os' and ``traceback' without meaning to. CPython can afford literal
ordering because the modules it protects are compiled into the binary and its
cache is warm before user code runs; Grail's stdlib is .py files on disk,
loaded lazily, and its own runtime reads them at moments no user code chose.

WHAT IT CLAIMS.  Exactly the modules GRAIL ITSELF SHIPS: anything resolvable
under ``importlib class >> ___grailOwnRoots___' -- the checkout and its ported
stdlib at src/python/stdlib. Not extraSearchRoots, not sys.path: those roots
were added by the caller, and a caller who added a tree is entitled to have a
finder serve out of it. That boundary is the same one
``___moduleNameToPath___:' has always drawn, now stated as a finder instead of
as a search order.

Grail's own tree is the right analogue of CPython's builtin + frozen set
because Grail's RUNTIME imports out of it at moments no user code chose:
warnings imports ``linecache' and ``re' while formatting a warning,
PyEnumTypes imports ``inspect' from inside a class body, CPythonShim imports
``contextvars' when a coroutine crosses the shim boundary. A finder that
answered any of those would be running user code inside Grail's own error and
class-construction paths. (A private, meta_path-free entry point for those four
callers was the other candidate fix; it would protect the runtime but would
leave a plain ``import traceback' in user code shadowable, which is the case
the pinned finder also covers.)

HOW IT IS CALLED.  Ordinary imports never reach the Python methods below:
``importlib class >> ___askFinder___:for:path:' recognises this class and does
the same resolution in Smalltalk. It has to -- answering ``find_spec' means
building a ModuleSpec, and the only ModuleSpec Grail has is in the Python-side
importlib facade, so answering would mean performing an import from inside the
import machinery on the first cold import of a session. The methods here are
real and answer the same thing; they exist so that ``sys.meta_path[0]' is a
genuine PEP 451 finder to anything that introspects or calls it.

REMOVING IT is allowed and is the whole opt-out: take this object out of
sys.meta_path and nothing is privileged any more -- a finder can then shadow
Grail's stdlib. CPython behaves the same way if you delete BuiltinImporter.
Re-ordering the list does NOT opt out, deliberately; removal is explicit and an
insert is not.

"
Class {
	#name : 'GrailBuiltinImporter',
	#superclass : 'object',
	#category : 'Grail-Import'
}

{ #category : 'Grail-Import' }
GrailBuiltinImporter >> ___grailPathFor___: aName [
	"The source path for aName if Grail ships it, else nil.  One place, so the
	finder and the loader halves cannot drift apart."

	(aName isKindOf: CharacterCollection) ifFalse: [^ nil].
	"___grailOwnedPathFor___: is an env-1 classmethod (it sits in importlib.gs's
	env-1 region beside ___moduleNameToPath___:), so the send names its
	environment explicitly from this env-0 method."
	^ importlib @env1:___grailOwnedPathFor___: aName asString

]

{ #category : 'Grail-Import' }
GrailBuiltinImporter >> ___pySpecFor___: aName [
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

]
