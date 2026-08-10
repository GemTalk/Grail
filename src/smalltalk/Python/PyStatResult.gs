! ------------------- Superclass check
run
object ifNil: [self error: 'object is not defined. Check file ordering.'].
%

! ------- PyStatResult (the os.stat_result CPython answers)
expectvalue /Class
doit
object subclass: 'PyStatResult'
  instVarNames: #()
  classVars: #()
  classInstVars: #()
  poolDictionaries: #()
  inDictionary: Python
  options: #()
%

expectvalue /Class
doit
PyStatResult comment:
'The object ``os.stat()'' / ``os.lstat()'' answer -- CPython''s os.stat_result.

os.stat used to hand back the raw GsFileStat.  That carries every field, but
under GemStone names (``size'', ``mtimeUtcSeconds'', ``mode'', ...), so Python
code reading the documented ``st_size'' / ``st_mtime'' got an AttributeError.
It is not a theoretical gap: linecache.updatecache does

    size, mtime = stat.st_size, stat.st_mtime

on every source-file lookup, and django''s session and file-storage backends
read st_mtime / st_gid.

CPython does not expose an OS struct either -- os.stat answers its own
stat_result -- so wrapping is the faithful shape as well as the compatible one.
Fields are stored as dynamic instVars named exactly as the Python attributes and
registered in ___pythonValueAttrs___, so ``st.st_size'' reads the VALUE rather
than a BoundMethod wrapping an accessor.

Times are whole seconds: GsFileStat exposes ``mtimeUtcSeconds'' and friends, so
this is coarser than CPython''s float on a high-resolution filesystem.  Every
consumer here uses them for change detection (linecache''s cache validity,
Django''s session expiry), which whole seconds serve.
'
%

expectvalue /Class
doit
PyStatResult category: 'Grail-Filesystem'
%

! ------------------- Remove existing methods
expectvalue /Metaclass3
doit
PyStatResult removeAllMethods.
PyStatResult class removeAllMethods.
PyStatResult removeAllMethods: 1.
PyStatResult class removeAllMethods: 1.
%

set compile_env: 0

category: 'Instance Creation'
classmethod: PyStatResult
on: aGsFileStat
	"Wrap a GsFileStat, translating each field to its CPython attribute name.
	Answers nil for nil so a caller can pass a failed stat straight through."

	| inst |
	aGsFileStat isNil ifTrue: [^ nil].
	inst := self new.
	inst dynamicInstVarAt: #'st_mode' put: aGsFileStat mode.
	inst dynamicInstVarAt: #'st_ino' put: aGsFileStat ino.
	inst dynamicInstVarAt: #'st_dev' put: aGsFileStat dev.
	inst dynamicInstVarAt: #'st_nlink' put: aGsFileStat nlink.
	inst dynamicInstVarAt: #'st_uid' put: aGsFileStat uid.
	inst dynamicInstVarAt: #'st_gid' put: aGsFileStat gid.
	inst dynamicInstVarAt: #'st_size' put: aGsFileStat size.
	inst dynamicInstVarAt: #'st_atime' put: aGsFileStat atimeUtcSeconds.
	inst dynamicInstVarAt: #'st_mtime' put: aGsFileStat mtimeUtcSeconds.
	inst dynamicInstVarAt: #'st_ctime' put: aGsFileStat ctimeUtcSeconds.
	"CPython also exposes the _ns triple; whole seconds scaled is honest and
	keeps arithmetic on them integral."
	inst dynamicInstVarAt: #'st_atime_ns' put: aGsFileStat atimeUtcSeconds * 1000000000.
	inst dynamicInstVarAt: #'st_mtime_ns' put: aGsFileStat mtimeUtcSeconds * 1000000000.
	inst dynamicInstVarAt: #'st_ctime_ns' put: aGsFileStat ctimeUtcSeconds * 1000000000.
	inst dynamicInstVarAt: #'st_blksize' put: aGsFileStat blksize.
	inst dynamicInstVarAt: #'st_blocks' put: aGsFileStat blocks.
	inst dynamicInstVarAt: #'st_rdev' put: aGsFileStat rdev.
	"Kept so Smalltalk callers that already have a GsFileStat in hand are not
	forced to re-stat; not a Python attribute."
	inst dynamicInstVarAt: #'___gsFileStat___' put: aGsFileStat.
	^ inst
%

category: 'Grail-Python Attribute Hook'
classmethod: PyStatResult
___pythonValueAttrs___
	"Every st_* field is a VALUE attribute, so a read answers the number rather
	than a BoundMethod wrapping the selector."

	^ IdentitySet new
		add: #'st_mode'; add: #'st_ino'; add: #'st_dev'; add: #'st_nlink';
		add: #'st_uid'; add: #'st_gid'; add: #'st_size';
		add: #'st_atime'; add: #'st_mtime'; add: #'st_ctime';
		add: #'st_atime_ns'; add: #'st_mtime_ns'; add: #'st_ctime_ns';
		add: #'st_blksize'; add: #'st_blocks'; add: #'st_rdev';
		yourself
%

set compile_env: 1

category: 'Grail-Filesystem'
method: PyStatResult
___gsFileStat___
	"The wrapped GsFileStat, for Smalltalk callers wanting a field this does
	not translate (isDirectory)."

	^ self @env0:dynamicInstVarAt: #'___gsFileStat___'
%

category: 'Grail-String Representation'
method: PyStatResult
__repr__
	"CPython renders os.stat_result(st_mode=..., st_size=..., ...); the same
	shape with the fields callers actually look at."

	^ 'os.stat_result(st_mode=' @env0:,
		(self @env0:dynamicInstVarAt: #'st_mode') @env0:printString @env0:,
		', st_size=' @env0:, (self @env0:dynamicInstVarAt: #'st_size') @env0:printString @env0:,
		', st_mtime=' @env0:, (self @env0:dynamicInstVarAt: #'st_mtime') @env0:printString @env0:,
		')'
%

set compile_env: 0
