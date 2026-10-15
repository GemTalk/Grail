"A module's ``__loader__' -- CPython's importlib.machinery.SourceFileLoader,
reduced to the part Grail can honour: answering the module's SOURCE.

Grail set ``__name__', ``__package__' and ``__file__' on every module but no
``__loader__', and the absence was not cosmetic.  CPython resolves a filename
that is not on disk through the CALLING module's loader:

    linecache.getlines(filename, module_globals)
      -> updatecache(filename, module_globals)
           os.stat(filename) raises OSError
           -> _make_lazycache_entry(filename, module_globals)
                loader = module_globals['__loader__']
                get_source = loader.get_source        # <- was always absent
                -> answers the CALLER's source

That is the documented PEP 302 path, and it is how a traceback shows source for
a frame whose co_filename does not name a readable file -- a frozen module, a
zipimport, a REPL entry, or a synthetic name.  With no ``__loader__'
_make_lazycache_entry answered None, updatecache fell through to the sys.path
scan, and every such lookup silently answered [] -- an empty ``line' with no
error to say why.

``get_source' reads the file at ``__file__' rather than the name it is passed:
Grail has one loader instance per module, created when that module is built, so
the path is already known and does not have to be re-resolved through the finder.
The name is still accepted and checked, because CPython raises ImportError when a
loader is asked for a module it does not handle, and callers (linecache included)
rely on that being an ImportError rather than a wrong answer.

"
Class {
	#name : 'PySourceFileLoader',
	#superclass : 'object',
	#category : 'Grail-Import'
}

{ #category : 'Grail-Python Attribute Hook' }
PySourceFileLoader class >> ___pythonValueAttrs___ [
	"``name'' and ``path'' are CPython''s attributes on a FileLoader, and both
	are values -- a read answers the string, not a BoundMethod."

	^ IdentitySet new
		add: #'name';
		add: #'path';
		yourself

]

{ #category : 'Instance Creation' }
PySourceFileLoader class >> name: aName path: aPath [
	"The loader for the module ``aName'' whose source is at ``aPath''.  Both are
	stored as dynamic instVars under their CPython attribute names, so
	``loader.name'' / ``loader.path'' read as values."

	| inst |
	inst := self new.
	inst dynamicInstVarAt: #'name' put: aName.
	inst dynamicInstVarAt: #'path' put: aPath.
	^ inst

]
