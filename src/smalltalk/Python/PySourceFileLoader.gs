! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- PySourceFileLoader (the module __loader__ CPython sets)
expectvalue /Class
doit
object subclass: 'PySourceFileLoader'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PySourceFileLoader comment:
'A module''s ``__loader__'' -- CPython''s importlib.machinery.SourceFileLoader,
reduced to the part Grail can honour: answering the module''s SOURCE.

Grail set ``__name__'', ``__package__'' and ``__file__'' on every module but no
``__loader__'', and the absence was not cosmetic.  CPython resolves a filename
that is not on disk through the CALLING module''s loader:

    linecache.getlines(filename, module_globals)
      -> updatecache(filename, module_globals)
           os.stat(filename) raises OSError
           -> _make_lazycache_entry(filename, module_globals)
                loader = module_globals[''__loader__'']
                get_source = loader.get_source        # <- was always absent
                -> answers the CALLER''s source

That is the documented PEP 302 path, and it is how a traceback shows source for
a frame whose co_filename does not name a readable file -- a frozen module, a
zipimport, a REPL entry, or a synthetic name.  With no ``__loader__''
_make_lazycache_entry answered None, updatecache fell through to the sys.path
scan, and every such lookup silently answered [] -- an empty ``line'' with no
error to say why.

``get_source'' reads the file at ``__file__'' rather than the name it is passed:
Grail has one loader instance per module, created when that module is built, so
the path is already known and does not have to be re-resolved through the finder.
The name is still accepted and checked, because CPython raises ImportError when a
loader is asked for a module it does not handle, and callers (linecache included)
rely on that being an ImportError rather than a wrong answer.
'
%

expectvalue /Class
doit
PySourceFileLoader category: 'Grail-Import'
%

! ------------------- Remove existing methods
expectvalue /Metaclass3
doit
PySourceFileLoader removeAllMethods.
PySourceFileLoader class removeAllMethods.
PySourceFileLoader removeAllMethods: 1.
PySourceFileLoader class removeAllMethods: 1.
%

set compile_env: 0

category: 'Instance Creation'
classmethod: PySourceFileLoader
name: aName path: aPath
	"The loader for the module ``aName'' whose source is at ``aPath''.  Both are
	stored as dynamic instVars under their CPython attribute names, so
	``loader.name'' / ``loader.path'' read as values."

	| inst |
	inst := self new.
	inst dynamicInstVarAt: #'name' put: aName.
	inst dynamicInstVarAt: #'path' put: aPath.
	^ inst
%

category: 'Grail-Python Attribute Hook'
classmethod: PySourceFileLoader
___pythonValueAttrs___
	"``name'' and ``path'' are CPython''s attributes on a FileLoader, and both
	are values -- a read answers the string, not a BoundMethod."

	^ IdentitySet new
		add: #'name';
		add: #'path';
		yourself
%

set compile_env: 1

category: 'Grail-Import'
method: PySourceFileLoader
get_filename: aName
	"CPython''s FileLoader.get_filename(fullname) -- the path this loader loads
	from."

	self ___checkName___: aName.
	^ self @env0:dynamicInstVarAt: #'path'
%

category: 'Grail-Import'
method: PySourceFileLoader
get_source: aName
	"CPython''s InspectLoader.get_source(fullname) -- the module''s source text,
	or None when it cannot be read.

	None (not an exception) is the documented answer for ''loader found the
	module but has no source for it'', and linecache depends on the
	distinction: it treats None as ''no luck, give up'' and an ImportError /
	OSError as ''try the next strategy''.  So a MISSING FILE answers None here
	rather than propagating the OSError -- the module was found, its source
	simply is not on disk any more."

	| path stream contents |
	self ___checkName___: aName.
	path := self @env0:dynamicInstVarAt: #'path'.
	path isNil ifTrue: [^ None].
	stream := GsFile @env0:openReadOnServer: path.
	stream isNil ifTrue: [^ None].
	contents := [stream @env0:contents] @env0:ensure: [stream @env0:close].
	contents isNil ifTrue: [^ None].
	"GsFile answers bytes; module source is decoded as UTF-8 everywhere else in
	Grail (see importlib>>astForPath:), so decode here too rather than handing
	Python a byte string it would render with \\x escapes."
	^ [contents @env0:decodeToUnicode] @env0:on: Error do: [:ex | ex @env0:return: contents]
%

category: 'Grail-Import'
method: PySourceFileLoader
is_package: aName
	"CPython''s is_package(fullname): true when the module is a package, which
	for a file loader means its source is the package''s __init__.py."

	| path |
	self ___checkName___: aName.
	path := self @env0:dynamicInstVarAt: #'path'.
	^ (path notNil and: [path @env0:endsWith: '__init__.py'])
%

category: 'Grail-Import'
method: PySourceFileLoader
___checkName___: aName
	"CPython raises ImportError when a loader is asked for a module it does not
	handle.  Callers rely on that being an ImportError specifically --
	linecache catches (ImportError, OSError) around the get_source call and
	moves on to its next strategy.

	A nil/None name means ''whatever you load'', which every CPython loader
	also tolerates."

	| own |
	(aName isNil or: [aName @env0:== None]) ifTrue: [^ self].
	own := self @env0:dynamicInstVarAt: #'name'.
	(own isNil or: [own @env0:= aName]) ifTrue: [^ self].
	^ ImportError ___signal___: ('loader for ' @env0:, own @env0:printString
		@env0:, ' cannot handle ' @env0:, aName @env0:printString)
%

category: 'Grail-String Representation'
method: PySourceFileLoader
__repr__
	"CPython: <_frozen_importlib_external.SourceFileLoader object at 0x...>;
	the informative shape instead, naming what it loads."

	^ '<SourceFileLoader name=' @env0:,
		(self @env0:dynamicInstVarAt: #'name') @env0:printString @env0:,
		' path=' @env0:, (self @env0:dynamicInstVarAt: #'path') @env0:printString
		@env0:, '>'
%

set compile_env: 0
