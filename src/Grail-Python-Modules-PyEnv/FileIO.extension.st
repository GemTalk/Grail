Extension { #name : 'FileIO' }

{ #category : 'Grail-Opening' }
FileIO class >> ___codecText___: aFileIO mode: modeArg encoding: encodingArg errors: errorsArg newline: newlineArg [
	"_pyio's TextIOWrapper over an open binary file, with ``mode'' set as
	CPython's open() sets it.  An encoding the codec registry does not know
	raises LookupError from here, and the binary file is closed first."

	| text |
	text := [((io instance) ___pyioClass___: #'TextIOWrapper')
			@env1:value: { aFileIO.
				(encodingArg == nil) ifTrue: [None] ifFalse: [encodingArg].
				(errorsArg == nil) ifTrue: [None] ifFalse: [errorsArg].
				(newlineArg == nil) ifTrue: [None] ifFalse: [newlineArg] }
			value: nil]
		@env0:ifCurtailed: [aFileIO close].
	text @env1:__setattr__: 'mode' _: modeArg.
	^ text

]

{ #category : 'Grail-Opening' }
FileIO class >> ___construct___: fileArg mode: modeArg [
	"``io.FileIO(name, mode)'': open the file and answer an instance OF SELF.

	Distinct from ___open___:mode:encoding: in three ways that all matter.

	It answers an instance of SELF, not of FileIO, so a SUBCLASS gets its own
	class -- which is the whole point.  test_wave's ``class UnseekableIO(
	io.FileIO)'' overrides tell/seek to raise, and 20 of its tests need it.
	Before this, FileIO had NO Python-visible constructor at all: ``io.FileIO(p,
	'rb')'' raised ``FileIO() takes wrong number of arguments'' -- while the
	SUBCLASS call silently answered an UNINITIALISED instance, because the call
	protocol fell back to plain ``new'' when it found no constructor.  The failure
	then surfaced far away, as ``nil does not understand #close'', naming neither
	the class nor the missing constructor.

	It is ALWAYS BINARY.  CPython's FileIO is a raw byte stream: it takes 'r',
	'w', 'x', 'a' and '+', ignores a 'b', and rejects 't' -- ``io.FileIO(p, 'rt')''
	is a ValueError there.  Text decoding is TextIOWrapper's job.

	And ``mode'' reports NORMALISED, with the 'b' put back and '+' last:
	CPython answers 'rb' for 'r' and 'rb+' for 'r+'."

	^ self @env0:new ___openInto___: fileArg mode: modeArg

]

{ #category : 'Grail-Opening' }
FileIO class >> ___fdOwners___ [
	"descriptor -> the Grail file whose fileno() handed it out, this session.
	Per session, as the descriptors are: they belong to this gem's process."

	^ SessionTemps @env0:current
		@env0:at: #'Grail_io_fd_owners'
		ifAbsentPut: [IntegerKeyValueDictionary @env0:new]

]

{ #category : 'Grail-Opening' }
FileIO class >> ___nativeEncoding___: anEncoding errors: anErrors [
	"The encoding Grail's own TextIOWrapper decodes for this open(), or nil
	when the file needs _pyio's (see ___open___:mode:encoding:errors:...).
	Only strict error handling is native: every other handler needs the
	codec."

	| e |
	(anErrors == nil @env0:or: [anErrors == None @env0:or: [
		(anErrors isKindOf: CharacterCollection) @env0:and: [anErrors @env0:= 'strict']]])
			ifFalse: [^ nil].
	(anEncoding == nil @env0:or: [anEncoding == None]) ifTrue: [^ 'utf-8'].
	(anEncoding isKindOf: CharacterCollection) ifFalse: [
		TypeError ___signal___: 'open() argument ''encoding'' must be str or None'].
	e := anEncoding @env0:asLowercase.
	((e @env0:= 'utf-8') @env0:or: [e @env0:= 'utf8']) ifTrue: [^ 'utf-8'].
	((e @env0:= 'latin-1') @env0:or: [(e @env0:= 'latin1') @env0:or: [(e @env0:= 'iso-8859-1') @env0:or: [e @env0:= 'l1']]]) ifTrue: [^ 'latin-1'].
	((e @env0:= 'iso-8859-15') @env0:or: [(e @env0:= 'iso8859-15') @env0:or: [(e @env0:= 'iso8859_15')
		@env0:or: [(e @env0:= 'latin-9') @env0:or: [(e @env0:= 'latin9') @env0:or: [e @env0:= 'l9']]]]])
			ifTrue: [^ 'iso-8859-15'].
	^ nil

]

{ #category : 'Grail-Opening' }
FileIO class >> ___open___: fileArg mode: modeArg encoding: encodingArg [
	"open(file, mode, encoding=encoding) with every later argument at its
	default."

	^ self ___open___: fileArg mode: modeArg encoding: encodingArg
		errors: nil newline: nil closefd: true

]

{ #category : 'Grail-Opening' }
FileIO class >> ___open___: fileArg mode: modeArg encoding: encodingArg errors: errorsArg newline: newlineArg closefd: closefdArg [
	"Master entry point behind the open() builtin and io.open().
	Parses the Python mode string, maps it to a GsFile fopen mode
	(always with 'b' - decoding is the TextIOWrapper's job), and
	answers a FileIO (binary) or TextIOWrapper (text) instance.

	TEXT MODE HAS TWO IMPLEMENTATIONS.  Grail's own TextIOWrapper decodes
	three encodings over the GsFile directly -- UTF-8, latin-1 and latin-9
	-- strictly, and that is what nearly every open() asks for.  Anything
	else (another encoding, or an errors handler other than strict) answers
	_pyio's TextIOWrapper over the binary file, which is how CPython's
	open() is built and which has the whole codec registry behind it.  Those
	arguments used to be dropped or refused: errors=xmlcharrefreplace was
	ignored, so a latin-1 file raised UnicodeEncodeError at the first
	character outside it; utf-16 and utf-8-sig were LookupError; and ascii
	silently wrote UTF-8.  test_sax's ParseTest writes its fixtures with
	each of these.

	``file'' may also be a descriptor, as in CPython -- see
	___openDescriptor___:."

	| file mode hasR hasW hasA hasX hasPlus hasB hasT count gsMode gsfile inst fd native |
	file := fileArg.
	fd := nil.
	(file isKindOf: CharacterCollection) ifFalse: [
		(file isKindOf: Integer)
			ifTrue: [fd := file]
			ifFalse: [
				"A bytes path is a filesystem name in the filesystem encoding,
				as os.fsdecode reads it.  It fell through to __str__ and was
				opened under its repr -- a name starting b' -- which never
				exists (test_sax test_expat_binary_file_bytes_name).  The
				file's NAME stays the bytes, as in CPython."
				(file isKindOf: ByteArray) ifTrue: [
					file := (os instance) fsdecode: file].
				"PEP 519 first: CPython's open() asks __fspath__, and only a
				PathLike is guaranteed to answer the actual filesystem path there.
				__str__ stays as the fallback because it is what this has always
				used and the two coincide for pathlib.Path — but a class free to
				define a display __str__ alongside a real __fspath__ would
				otherwise be opened under whatever its repr-ish text happened to be."
				file := (os instance) ___fsPath___: file.
				(file isKindOf: CharacterCollection) ifFalse: [file := file __str__]]].
	"AN EMBEDDED NUL IS A BAD ARGUMENT, not a missing file.  A path cannot
	hold one -- the OS call takes a NUL-terminated string, so everything after
	it is silently dropped -- and CPython refuses up front with ``ValueError:
	embedded null byte''.

	Grail passed it through, and the open then failed as a FileNotFoundError
	naming a path the caller did not ask for (the truncated one).  Wrong
	exception for the wrong reason: a caller catching FileNotFoundError to
	CREATE the file would go on to create it under the truncated name.
	test_builtin test_open checks the str and the bytes spelling."
	(fd == nil @env0:and: [(FileIO ___pathHasNul___: file) @env0:or: [FileIO ___pathHasNul___: fileArg]]) ifTrue: [
		^ ValueError ___signal___: 'embedded null byte'].
	(fd == nil @env0:and: [closefdArg ___isTruthy___ @env0:not]) ifTrue: [
		^ ValueError ___signal___: 'Cannot use closefd=False with file name'].
	mode := (modeArg == nil @env0:or: [modeArg == None]) ifTrue: ['r'] ifFalse: [modeArg].
	(mode isKindOf: CharacterCollection) ifFalse: [
		TypeError ___signal___: 'open() argument ''mode'' must be str'].
	hasR := false. hasW := false. hasA := false. hasX := false.
	hasPlus := false. hasB := false. hasT := false.
	mode @env0:do: [:c |
		c @env0:= $r ifTrue: [hasR := true]
		ifFalse: [c @env0:= $w ifTrue: [hasW := true]
		ifFalse: [c @env0:= $a ifTrue: [hasA := true]
		ifFalse: [c @env0:= $x ifTrue: [hasX := true]
		ifFalse: [c @env0:= $+ ifTrue: [hasPlus := true]
		ifFalse: [c @env0:= $b ifTrue: [hasB := true]
		ifFalse: [c @env0:= $t ifTrue: [hasT := true]
		ifFalse: [ValueError ___signal___: ('invalid mode: ''' @env0:, mode @env0:, '''')]]]]]]]].
	count := 0.
	hasR ifTrue: [count := count @env0:+ 1].
	hasW ifTrue: [count := count @env0:+ 1].
	hasA ifTrue: [count := count @env0:+ 1].
	hasX ifTrue: [count := count @env0:+ 1].
	count @env0:= 1 ifFalse: [
		ValueError ___signal___: 'must have exactly one of create/read/write/append mode'].
	(hasB @env0:and: [hasT]) ifTrue: [
		ValueError ___signal___: 'can''t have text and binary mode at once'].
	(hasB @env0:and: [(encodingArg == nil @env0:or: [encodingArg == None]) @env0:not]) ifTrue: [
		ValueError ___signal___: 'binary mode doesn''t take an encoding argument'].
	"``== true'' on every GsFile predicate here.  BOTH answer nil rather
	than false when the probe itself errors -- and a path whose PARENT is a
	plain file makes that ordinary (``open(''grail/x.txt'')'', where ./grail
	is the CLI shell script, stats with ENOTDIR).  A nil reaching an inlined
	ifTrue:/and:/not: raised ImproperOperation (error 2085, ``Expected nil
	to be a Boolean''), which no ``except OSError'' can catch, instead of
	the NotADirectoryError CPython raises.  ``== true'' alone also subsumes
	the old existsOnServer: pre-guard: isServerDirectory: answers nil for a
	path that is not there, which is not true."
	native := hasB ifTrue: [nil] ifFalse: [
		FileIO ___nativeEncoding___: encodingArg errors: errorsArg].
	fd == nil ifFalse: [
		^ FileIO ___openDescriptor___: fd mode: mode binary: hasB
			readable: ((hasR) @env0:or: [hasPlus])
			writable: ((hasR @env0:not) @env0:or: [hasPlus])
			native: native encoding: encodingArg errors: errorsArg
			newline: newlineArg closefd: closefdArg].
	((GsFile @env0:isServerDirectory: file) == true) ifTrue: [
		(os instance) ___signalErrno: 21 filename: file].
	hasX ifTrue: [
		((GsFile @env0:existsOnServer: file) == true) ifTrue: [
			(os instance) ___signalErrno: 17 filename: file]].
	gsMode := hasR ifTrue: ['r'] ifFalse: [hasA ifTrue: ['a'] ifFalse: ['w']].
	hasPlus ifTrue: [gsMode := gsMode @env0:, '+'].
	gsMode := gsMode @env0:, 'b'.
	gsfile := GsFile @env0:openOnServer: file mode: gsMode.
	gsfile == nil ifTrue: [
		"Ask STAT why, rather than re-testing existence: os >>
		___statOrSignal___: already raises the errno as CPython does (ENOENT
		-> FileNotFoundError, ENOTDIR -> NotADirectoryError, EACCES ->
		PermissionError, each carrying errno, strerror and filename), so a
		shadowed path reports what is actually wrong instead of ``No such
		file''.  It raises whenever the stat fails;
		reaching past it means the file IS there and the open failed for
		another reason."
		(os instance) ___statOrSignal___: file isLstat: false.
		OSError ___signal___: ('could not open file: ''' @env0:, file @env0:, '''')].
	inst := ((hasB @env0:or: [native == nil]) ifTrue: [FileIO] ifFalse: [TextIOWrapper]) @env0:new.
	inst ___initGsFile___: gsfile
		name: ((fileArg isKindOf: ByteArray) ifTrue: [fileArg] ifFalse: [file])
		mode: mode
		readable: ((hasR) @env0:or: [hasPlus])
		writable: ((hasR @env0:not) @env0:or: [hasPlus]).
	hasB ifTrue: [^ inst].
	native == nil ifTrue: [
		^ FileIO ___codecText___: inst mode: mode encoding: encodingArg
			errors: errorsArg newline: newlineArg].
	inst @env0:dynamicInstVarAt: #_encoding put: native.
	^ inst

]

{ #category : 'Grail-Opening' }
FileIO class >> ___openCompressedPath___: fileArg mode: modeArg [
	"Backing for gzip.open / gzip.compress / gzip.decompress: a file
	object whose GsFile transparently reads/writes gzip framing
	(GsFile openOnServerCompressed:mode:).  Python modes rb/wb/ab
	(binary) and rt/wt/at (text, utf-8).  The instance is flagged
	#_streamOnly: fileSize reports the COMPRESSED size, so full reads
	must chunk to EOF and seek/tell are unreliable."

	| file mode reading binary base gsfile inst |
	file := fileArg.
	(file isKindOf: CharacterCollection) ifFalse: [file := file __str__].
	mode := (modeArg == nil @env0:or: [modeArg == None]) ifTrue: ['rb'] ifFalse: [modeArg].
	binary := (mode @env0:includes: $t) @env0:not.
	reading := mode @env0:includes: $r.
	base := reading
		ifTrue: ['rb']
		ifFalse: [(mode @env0:includes: $a) ifTrue: ['ab'] ifFalse: ['wb']].
	"``~~ true'', not ``not'': existsOnServer: answers nil when the probe
	errors, and nil ``not'' is error 2085 (see ___open___).  The stat call
	then reports WHICH error -- ENOENT, ENOTDIR, EACCES -- as the matching
	OSError subclass."
	((GsFile @env0:existsOnServer: file) ~~ true @env0:and: [reading]) ifTrue: [
		(os instance) ___statOrSignal___: file isLstat: false.
		(os instance) ___signalErrno: 2 filename: file].
	gsfile := GsFile @env0:openOnServerCompressed: file mode: base.
	gsfile == nil ifTrue: [
		OSError ___signal___: ('could not open compressed file: ''' @env0:, file @env0:, '''')].
	inst := (binary ifTrue: [FileIO] ifFalse: [TextIOWrapper]) @env0:new.
	inst @env0:dynamicInstVarAt: #_gsfile put: gsfile.
	inst @env0:dynamicInstVarAt: #_name put: file.
	inst @env0:dynamicInstVarAt: #_mode put: mode.
	inst @env0:dynamicInstVarAt: #_closed put: false.
	inst @env0:dynamicInstVarAt: #_readable put: reading.
	inst @env0:dynamicInstVarAt: #_writable put: reading @env0:not.
	inst @env0:dynamicInstVarAt: #_streamOnly put: true.
	binary ifFalse: [inst @env0:dynamicInstVarAt: #_encoding put: 'utf-8'].
	^ inst

]

{ #category : 'Grail-Opening' }
FileIO class >> ___openDescriptor___: fd mode: mode binary: isBinary readable: isReadable writable: isWritable native: native encoding: encodingArg errors: errorsArg newline: newlineArg closefd: closefdArg [
	"open(fd, ...) -- a file object over a descriptor this session already
	has, as open(f.fileno(), 'rb', closefd=False) does (test_sax
	test_expat_binary_file_int_name).  Two kinds qualify:

	  * one a Grail file's fileno() handed out: the new object shares that
	    file's GsFile, and so its position -- which is what sharing a
	    descriptor means in CPython too.  closefd=False leaves it open when
	    the new object closes;
	  * one os.open handed out: _pyio.open, which is built on os's
	    descriptor functions, opens it.

	Any other number is EBADF, the answer os gives for the same reason (see
	os's descriptor section): the gem's own descriptors share this process,
	and a Python file object over one of them could break the session."

	| owner gsfile inst |
	(fd isKindOf: SmallInteger) ifFalse: [
		^ OverflowError ___signal___: 'Python int too large to convert to C int'].
	fd @env0:< 0 ifTrue: [^ ValueError ___signal___: 'negative file descriptor'].
	owner := self ___fdOwners___ @env0:at: fd ifAbsent: [nil].
	(owner ~~ nil
		@env0:and: [(owner @env0:dynamicInstVarAt: #_closed) ~~ true
		@env0:and: [((owner @env0:dynamicInstVarAt: #_gsfile) @env0:fileDescriptor) @env0:= fd]])
			ifTrue: [
				gsfile := owner @env0:dynamicInstVarAt: #_gsfile.
				inst := ((isBinary @env0:or: [native == nil]) ifTrue: [FileIO] ifFalse: [TextIOWrapper]) @env0:new.
				inst ___initGsFile___: gsfile name: fd mode: mode
					readable: isReadable writable: isWritable.
				closefdArg ___isTruthy___ ifFalse: [
					inst @env0:dynamicInstVarAt: #_closefd put: false].
				isBinary ifTrue: [^ inst].
				native == nil ifTrue: [
					^ self ___codecText___: inst mode: mode encoding: encodingArg
						errors: errorsArg newline: newlineArg].
				inst @env0:dynamicInstVarAt: #_encoding put: native.
				^ inst].
	(os ___openFds @env0:includes: fd) ifTrue: [
		^ ((io instance) ___pyioModule___ @env1:___pyAttrLoad___: #'open')
			@env1:value: { fd. mode. -1.
				(encodingArg == nil) ifTrue: [None] ifFalse: [encodingArg].
				(errorsArg == nil) ifTrue: [None] ifFalse: [errorsArg].
				(newlineArg == nil) ifTrue: [None] ifFalse: [newlineArg].
				closefdArg }
			value: nil].
	^ (os instance) ___signalErrno: 9

]

{ #category : 'Grail-Opening' }
FileIO class >> ___pathHasNul___: aPath [
	"True when a path argument carries an embedded NUL.

	Asked of BOTH the coerced string and the ORIGINAL argument, because
	``open(b'a\\x00b')'' arrives as bytes and the coercion turns it into the
	bytes object's printString, in which the NUL is no longer a NUL.  Checking
	only the coerced form lets the bytes spelling through, which is the half
	test_open checks second."

	(aPath @env0:isKindOf: CharacterCollection) ifTrue: [
		^ aPath @env0:anySatisfy: [:c | c @env0:codePoint @env0:= 0]].
	(aPath @env0:isKindOf: ByteArray) ifTrue: [
		^ aPath @env0:includes: 0].
	^ false

]

{ #category : 'Grail-Introspection' }
FileIO class >> __module__ [

	"CPython's io classes come from the C accelerator, _io.  Grail's had no
	__module__ at all, so test.support.check__all__ -- which asks it of every
	name a module holds -- counted plistlib's imported BytesIO as plistlib's
	own public API (test_plistlib test__all__)."

	^ '_io'

]

{ #category : 'Grail-Opening' }
FileIO class >> __new__ [
	"``io.FileIO()'' -- the file name is required.

	Needed as its own arity: a 0-positional call does not reach the varargs
	``_new:kw:'' form (which does guard for it), so without this it fell through
	to plain ``new'' and answered an UNINITIALISED instance -- the same silent
	failure the subclass path had, one arity over.  Caught by the fixture's
	a_missing_name_is_a_typeerror, which is exactly what that check is for."

	^ TypeError ___signal___: 'FileIO() missing required argument ''file'' (pos 1)'

]

{ #category : 'Grail-Opening' }
FileIO class >> __new__: fileArg [
	"``io.FileIO(name)'' -- CPython's default mode is 'r'."

	^ self ___construct___: fileArg mode: 'r'

]

{ #category : 'Grail-Opening' }
FileIO class >> __new__: fileArg _: modeArg [
	"``io.FileIO(name, mode)''."

	^ self ___construct___: fileArg mode: modeArg

]

{ #category : 'Grail-Opening' }
FileIO class >> _new: posArgs kw: kwArgs [
	"``io.FileIO(name, mode='r', closefd=True, opener=None)'' in its varargs form,
	which is also the form a keyword call arrives in.

	closefd/opener are ACCEPTED AND IGNORED rather than rejected: Grail's FileIO
	owns its GsFile unconditionally (there are no integer file descriptors to
	borrow -- ___open___ raises TypeError for one), so closefd=True is the only
	behaviour available and is the default.  Rejecting the name outright would
	fail calls that merely pass the default explicitly."

	| n file mode |
	n := posArgs @env0:size.
	(n @env0:< 1 @env0:or: [n @env0:> 4]) ifTrue: [
		TypeError ___signal___: 'FileIO() takes 1 to 4 positional arguments'].
	file := posArgs @env0:at: 1.
	mode := n @env0:>= 2 ifTrue: [posArgs @env0:at: 2] ifFalse: [
		(kwArgs == nil @env0:or: [kwArgs == None])
			ifTrue: ['r']
			ifFalse: [kwArgs @env0:at: 'mode' ifAbsent: ['r']]].
	^ self ___construct___: file mode: mode

]

{ #category : 'Grail-Opening' }
FileIO >> ___initGsFile___: gsfile name: aName mode: aMode readable: isReadable writable: isWritable [
	"Stamp the six bookkeeping instVars every FileIO needs onto SELF.

	Extracted so the open() path and the ``io.FileIO(name, mode)'' constructor
	initialise an instance the same way.  open() builds the instance itself (it
	chooses FileIO vs TextIOWrapper from the mode); the constructor cannot, since
	the class is already fixed -- and is usually a SUBCLASS."

	self @env0:dynamicInstVarAt: #_gsfile put: gsfile.
	self @env0:dynamicInstVarAt: #_name put: aName.
	self @env0:dynamicInstVarAt: #_mode put: aMode.
	self @env0:dynamicInstVarAt: #_closed put: false.
	self @env0:dynamicInstVarAt: #_readable put: isReadable.
	self @env0:dynamicInstVarAt: #_writable put: isWritable.
	^ self

]

{ #category : 'Grail-Private' }
FileIO >> ___ioRead___: n [
	"read(size=-1) - read up to size bytes; -1 / None means to EOF."

	self _checkReadable.
	(n == nil @env0:or: [n == None @env0:or: [n @env0:< 0]]) ifTrue: [
		^ (self _readToEnd) @env0:asByteArray].
	^ (self _rawRead: n) @env0:asByteArray

]

{ #category : 'Grail-Private' }
FileIO >> ___ioReadline___: limit [
	self _checkReadable.
	^ (self _rawReadline: limit) @env0:asByteArray

]

{ #category : 'Grail-Private' }
FileIO >> ___ioSeek___: pos whence: whence [
	"seek(pos, whence=0): 0=set, 1=cur, 2=end.  Byte offsets."

	| f |
	self _checkOpen.
	f := self @env0:dynamicInstVarAt: #_gsfile.
	whence @env0:= 0 ifTrue: [
		pos @env0:< 0 ifTrue: [
			ValueError ___signal___: ('negative seek position ' @env0:, pos @env0:printString)].
		f @env0:position: pos]
	ifFalse: [whence @env0:= 1 ifTrue: [
		"GsFile seekFromCurrent: rejects negative offsets; skip: does a
		proper relative seek in both directions."
		f @env0:skip: pos]
	ifFalse: [whence @env0:= 2 ifTrue: [f @env0:seekFromEnd: pos]
	ifFalse: [
		ValueError ___signal___: 'whence must be 0, 1, or 2'
	]]].
	^ f @env0:position

]

{ #category : 'Grail-Private' }
FileIO >> ___ioTruncate___: size [
	OSError ___signal___: 'truncate() is not supported in Grail'

]

{ #category : 'Grail-Opening' }
FileIO >> ___openInto___: fileArg mode: modeArg [
	"Open ``fileArg'' and initialise SELF from it -- the instance-side half of the
	FileIO constructor.

	Instance-side on purpose: the SUBCLASS path cannot allocate.  A Python
	``class UnseekableIO(io.FileIO)'' is allocated by ClassDefAst's general
	construction path and then handed to ___pyBuiltinSubclassInit___, which has an
	instance and needs it initialised in place -- so both routes end here rather
	than one of them answering a fresh object the other would throw away."

	| mode normalised opened |
	mode := (modeArg == nil @env0:or: [modeArg == None]) ifTrue: ['r'] ifFalse: [modeArg].
	(mode isKindOf: CharacterCollection) ifFalse: [
		TypeError ___signal___: 'FileIO() argument ''mode'' must be str'].
	(mode @env0:includes: $t) ifTrue: [
		"CPython: io.FileIO(p, 'rt') is a ValueError.  FileIO is a RAW byte
		 stream; text is TextIOWrapper's job."
		ValueError ___signal___: ('invalid mode: ' @env0:, mode)].
	"``r'' -> ``rb''.  ___open___ parses either and owns the rest of the
	 validation (exactly one of r/w/x/a, no stray letters), so there is one
	 definition of what a mode string means."
	normalised := (mode @env0:includes: $b) ifTrue: [mode] ifFalse: [mode @env0:, 'b'].
	opened := FileIO ___open___: fileArg mode: normalised encoding: nil.
	self ___initGsFile___: (opened @env0:dynamicInstVarAt: #_gsfile)
		name: (opened @env0:dynamicInstVarAt: #_name)
		mode: (opened @env0:dynamicInstVarAt: #_mode)
		readable: (opened @env0:dynamicInstVarAt: #_readable)
		writable: (opened @env0:dynamicInstVarAt: #_writable).
	^ self ___renormaliseMode___

]

{ #category : 'Grail-Opening' }
FileIO >> ___renormaliseMode___ [
	"Report ``mode'' the way CPython's FileIO does: 'b' present, '+' last.

	open() keeps the mode string the CALLER passed, which is right for open() --
	``open(p).mode'' is 'r' there too.  FileIO is the one that normalises:
	``io.FileIO(p, 'r').mode'' is 'rb' and ``io.FileIO(p, 'r+').mode'' is 'rb+'."

	| m base |
	m := self @env0:dynamicInstVarAt: #_mode.
	(m isKindOf: CharacterCollection) ifFalse: [^ self].
	base := WriteStream @env0:on: String @env0:new.
	m @env0:do: [:c |
		((c @env0:= $b) @env0:or: [c @env0:= $+]) ifFalse: [base @env0:nextPut: c]].
	base @env0:nextPut: $b.
	(m @env0:includes: $+) ifTrue: [base @env0:nextPut: $+].
	self @env0:dynamicInstVarAt: #_mode put: base @env0:contents.
	^ self

]

{ #category : 'Grail-Context manager' }
FileIO >> __enter__ [
	^ self

]

{ #category : 'Grail-Context manager' }
FileIO >> __exit__: a _: b _: c [
	self close.
	^ false

]

{ #category : 'Grail-Iter protocol' }
FileIO >> __iter__ [
	^ self

]

{ #category : 'Grail-Iter protocol' }
FileIO >> __next__ [
	| line |
	line := self readline.
	line @env0:isEmpty ifTrue: [
		StopIteration ___signal___: ''
	].
	^ line

]

{ #category : 'Grail-Private' }
FileIO >> _checkOpen [
	(self @env0:dynamicInstVarAt: #_closed) == true ifTrue: [
		ValueError ___signal___: 'I/O operation on closed file.']

]

{ #category : 'Grail-Private' }
FileIO >> _checkReadable [
	self _checkOpen.
	(self @env0:dynamicInstVarAt: #_readable) == true ifFalse: [
		OSError ___signal___: 'not readable']

]

{ #category : 'Grail-Private' }
FileIO >> _checkWritable [
	self _checkOpen.
	(self @env0:dynamicInstVarAt: #_writable) == true ifFalse: [
		OSError ___signal___: 'not writable']

]

{ #category : 'Grail-Private' }
FileIO >> _rawRead: n [
	"Read up to n bytes from the GsFile; answer a raw byte String
	(possibly empty - GsFile next: answers nil at EOF)."

	| f r |
	n @env0:<= 0 ifTrue: [^ String @env0:new].
	f := self @env0:dynamicInstVarAt: #_gsfile.
	r := f @env0:next: n.
	r == nil ifTrue: [^ String @env0:new].
	^ r

]

{ #category : 'Grail-Private' }
FileIO >> _rawReadline: limit [
	"Read one line including its trailing \n (GsFile nextLine keeps the
	terminator).  A non-negative limit caps the read at `limit` bytes,
	repositioning the file just past the returned chunk."

	| f start line |
	f := self @env0:dynamicInstVarAt: #_gsfile.
	start := f @env0:position.
	line := f @env0:nextLine.
	line == nil ifTrue: [^ String @env0:new].
	(limit == nil @env0:or: [limit == None @env0:or: [limit @env0:< 0]]) ifFalse: [
		line @env0:size @env0:> limit ifTrue: [
			line := line @env0:copyFrom: 1 to: limit.
			f @env0:position: start @env0:+ limit]].
	^ line

]

{ #category : 'Grail-Private' }
FileIO >> _readToEnd [
	"Read everything from the current position.  Plain files size the
	read from fileSize; gzip-compressed GsFiles report the COMPRESSED
	size there, so streams flagged #_streamOnly chunk-read until EOF."

	| out chunk |
	(self @env0:dynamicInstVarAt: #_streamOnly) == true ifFalse: [
		^ self _rawRead: (self _remaining)].
	out := String @env0:new.
	[
		chunk := (self @env0:dynamicInstVarAt: #_gsfile) @env0:next: 65536.
		chunk == nil
	] @env0:whileFalse: [out := out @env0:, chunk].
	^ out

]

{ #category : 'Grail-Private' }
FileIO >> _remaining [
	| f |
	f := self @env0:dynamicInstVarAt: #_gsfile.
	^ (f @env0:fileSize @env0:- f @env0:position) @env0:max: 0

]

{ #category : 'Grail-State' }
FileIO >> close [
	"Idempotent, like CPython.  A file opened over a borrowed descriptor
	with closefd=False leaves the GsFile to its owner."

	| gsfile owners fd |
	(self @env0:dynamicInstVarAt: #_closed) == true ifTrue: [^ None].
	gsfile := self @env0:dynamicInstVarAt: #_gsfile.
	owners := SessionTemps @env0:current @env0:at: #'Grail_io_fd_owners' ifAbsent: [nil].
	owners == nil ifFalse: [
		fd := gsfile @env0:fileDescriptor.
		((fd isKindOf: SmallInteger) @env0:and: [(owners @env0:at: fd ifAbsent: [nil]) == self])
			ifTrue: [owners @env0:removeKey: fd]].
	(self @env0:dynamicInstVarAt: #_closefd) == false ifFalse: [gsfile @env0:close].
	self @env0:dynamicInstVarAt: #_closed put: true.
	^ None

]

{ #category : 'Grail-State' }
FileIO >> closed [
	^ (self @env0:dynamicInstVarAt: #_closed)

]

{ #category : 'Grail-State' }
FileIO >> fileno [
	"io.IOBase.fileno() — the underlying OS file descriptor.

	This used to refuse outright.  It need not: every open server-side
	GsFile carries a real fd, which ``GsFile >> _open:mode:onClient:''
	fills in from the GsfGetFileDesc user action and ``IO >>
	fileDescriptor'' answers.

	Two cases still have no descriptor to report, and CPython's own
	contract for them is OSError (``UnsupportedOperation'' is an OSError
	subclass): a client-side file, where the fd lives in the client
	process and is -1 here, and a compressed stream, which GsFile drives
	through zlib rather than a plain descriptor."

	| fd |
	self _checkOpen.
	fd := (self @env0:dynamicInstVarAt: #_gsfile) @env0:fileDescriptor.
	((fd isKindOf: Integer) and: [fd @env0:>= 0]) ifFalse: [
		OSError ___signal___: 'fileno() is unavailable for this file'
	].
	"Remembered, so open(fd) can find the file it belongs to."
	FileIO ___fdOwners___ @env0:at: fd put: self.
	^ fd

]

{ #category : 'Grail-State' }
FileIO >> flush [
	self _checkOpen.
	(self @env0:dynamicInstVarAt: #_gsfile) @env0:flush.
	^ None

]

{ #category : 'Grail-State' }
FileIO >> isatty [
	"Whether this stream is attached to a terminal.  GsFile answers this
	for the standard streams (``isTerminal'' tests the file kind); it was
	previously hardcoded false, which made ``sys.stdout.isatty()'' lie in
	an interactive topaz session."

	self _checkOpen.
	^ ((self @env0:dynamicInstVarAt: #_gsfile) @env0:isTerminal) == true

]

{ #category : 'Grail-State' }
FileIO >> mode [
	^ (self @env0:dynamicInstVarAt: #_mode)

]

{ #category : 'Grail-State' }
FileIO >> name [
	^ (self @env0:dynamicInstVarAt: #_name)

]

{ #category : 'Grail-Reading' }
FileIO >> read [
	^ self ___ioRead___: -1

]

{ #category : 'Grail-Reading' }
FileIO >> read: n [
	^ self ___ioRead___: n

]

{ #category : 'Grail-State' }
FileIO >> readable [
	self _checkOpen.
	^ (self @env0:dynamicInstVarAt: #_readable) == true

]

{ #category : 'Grail-Reading' }
FileIO >> readline [
	^ self ___ioReadline___: -1

]

{ #category : 'Grail-Reading' }
FileIO >> readline: limit [
	^ self ___ioReadline___: limit

]

{ #category : 'Grail-Reading' }
FileIO >> readlines [
	"Read all remaining lines into a list.  Goes through self readline
	so the TextIOWrapper subclass inherits this unchanged."

	| out line |
	self _checkReadable.
	out := list ___new___.
	[
		line := self readline.
		line @env0:isEmpty
	] @env0:whileFalse: [out append: line].
	^ out

]

{ #category : 'Grail-Position' }
FileIO >> seek: pos [
	^ self ___ioSeek___: pos whence: 0

]

{ #category : 'Grail-Position' }
FileIO >> seek: pos _: whence [
	^ self ___ioSeek___: pos whence: whence

]

{ #category : 'Grail-State' }
FileIO >> seekable [
	self _checkOpen.
	^ true

]

{ #category : 'Grail-Position' }
FileIO >> tell [
	self _checkOpen.
	^ (self @env0:dynamicInstVarAt: #_gsfile) @env0:position

]

{ #category : 'Grail-Position' }
FileIO >> truncate [
	^ self ___ioTruncate___: nil

]

{ #category : 'Grail-Position' }
FileIO >> truncate: size [
	^ self ___ioTruncate___: size

]

{ #category : 'Grail-State' }
FileIO >> writable [
	self _checkOpen.
	^ (self @env0:dynamicInstVarAt: #_writable) == true

]

{ #category : 'Grail-Writing' }
FileIO >> write: data [
	"Write bytes; answer the byte count (CPython contract)."

	| bytes f r |
	self _checkWritable.
	(data isKindOf: CharacterCollection) ifTrue: [
		TypeError ___signal___: 'a bytes-like object is required, not ''str'''].
	bytes := (data isKindOf: ByteArray) ifTrue: [data] ifFalse: [data @env0:asByteArray].
	bytes @env0:isEmpty ifTrue: [^ 0].
	f := self @env0:dynamicInstVarAt: #_gsfile.
	r := f @env0:nextPutAllBytes: bytes.
	r == nil ifTrue: [
		OSError ___signal___: ('write failed: ' @env0:, (self @env0:dynamicInstVarAt: #_name))].
	^ bytes @env0:size

]

{ #category : 'Grail-Writing' }
FileIO >> writelines: lines [
	"Write each element of lines in order.  Iterate LAZILY via the Python
	protocol (__iter__/__next__), NOT a Smalltalk #do:: a non-iterable
	argument (None/int) then raises a catchable TypeError instead of a #do:
	MessageNotUnderstood, and a dict yields its KEYS -- matching CPython
	(test_iter test_writelines).  A text file is a TextIOWrapper < FileIO, so
	it inherits this."

	| it |
	self _checkWritable.
	it := lines __iter__.
	[true] @env0:whileTrue: [ | line |
		line := [it __next__] @env0:on: StopIteration do: [:ex | ^ None].
		self write: line]

]
