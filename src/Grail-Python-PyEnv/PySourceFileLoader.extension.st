Extension { #name : 'PySourceFileLoader' }

{ #category : 'Grail-Import' }
PySourceFileLoader >> ___checkName___: aName [
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

]

{ #category : 'Grail-String Representation' }
PySourceFileLoader >> __repr__ [
	"CPython: <_frozen_importlib_external.SourceFileLoader object at 0x...>;
	the informative shape instead, naming what it loads."

	^ '<SourceFileLoader name=' @env0:,
		(self @env0:dynamicInstVarAt: #'name') @env0:printString @env0:,
		' path=' @env0:, (self @env0:dynamicInstVarAt: #'path') @env0:printString
		@env0:, '>'

]

{ #category : 'Grail-Import' }
PySourceFileLoader >> get_filename: aName [
	"CPython''s FileLoader.get_filename(fullname) -- the path this loader loads
	from."

	self ___checkName___: aName.
	^ self @env0:dynamicInstVarAt: #'path'

]

{ #category : 'Grail-Import' }
PySourceFileLoader >> get_source: aName [
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

]

{ #category : 'Grail-Import' }
PySourceFileLoader >> is_package: aName [
	"CPython''s is_package(fullname): true when the module is a package, which
	for a file loader means its source is the package''s __init__.py."

	| path |
	self ___checkName___: aName.
	path := self @env0:dynamicInstVarAt: #'path'.
	^ (path notNil and: [path @env0:endsWith: '__init__.py'])

]
