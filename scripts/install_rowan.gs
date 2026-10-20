! ===============================================================================
! Grail installation through Rowan -- the counterpart of src/smalltalk/install.gs.
!   file  scripts/install_rowan.gs   (run by install.sh when GRAIL_INSTALL=rowan)
! Needs an extent with Rowan masterV4 7d50ec0c8 or later (shadowsGlobals, unicodeSource,
! gs_superclassDictionary, per-user session-method extensions of kernel classes).
! ===============================================================================
! Rowan loads the Grail project (rowan/specs/Grail.ston) from $GRAIL_DIR; the component's
! pre-/post-load doits (rowan/components/doits) carry install.gs's other steps.
! ===============================================================================
output pushnew install.out
fileformat utf8
iferr 1 exit 1
login

iferr 1 where
iferr 2 output pop
iferr 3 where
iferr 4 exit 1

run
| grailDir warnings symList hidden project previousMigrator |
grailDir := System gemEnvironmentVariable: 'GRAIL_DIR'.
grailDir ifNil: [ ^ self error: 'GRAIL_DIR is not set' ].
warnings := OrderedCollection new.
"Read the project with Grail's own dictionaries out of the symbol list. Rowan's STON
reader resolves the class names in its files (package.st's Package, ...) through the
symbol list BEFORE the classes it was told to use, so on a reinstall a Grail class of
the same name is found instead -- an installed Grail's Package AST class made every
second ./install.sh fail with 'a Package does not understand #at:ifAbsent:'. They go
back, at the same places, before the load, which needs them."
symList := System myUserProfile symbolList.
hidden := OrderedCollection new.
#(#Python #PythonAst #EmbeddedPython #PythonTests #EmbeddedPythonTests #PythonModules) do: [:name |
	| idx |
	idx := symList names indexOf: name.
	idx > 0 ifTrue: [ hidden addFirst: idx -> (symList at: idx). symList removeAtIndex: idx ] ].
[ project := Rowan projectFromUrl: 'file:' , grailDir , '/rowan/specs/Grail.ston' diskUrl: 'file:' , grailDir ]
	ensure: [ hidden do: [:each | System myUserProfile insertDictionary: each value at: each key ] ].
"Migrate instances to a new version of a class: a release that changes a Grail class's shape
(an instance variable added or removed) gets a new class version, and objects an application
stored are instances of the old one. Rowan's default migrator leaves them there. Reached through
the platform's own migrator because the class is not in an ordinary user's symbol list, and set
on the platform because the public project has no load: that takes one."
previousMigrator := Rowan platform instanceMigrator.
Rowan platform instanceMigrator: previousMigrator class conservativeMigration.
[ [ project load ] ensure: [ Rowan platform instanceMigrator: previousMigrator ] ]
	on: CompileWarning
	do: [:ex |
		(ex description includesString: 'not optimized') ifFalse: [ warnings add: ex description ].
		ex resume ].
warnings do: [:w | Transcript show: 'COMPILE WARNING ' , w ].
Transcript show: 'Rowan loaded Grail: ' , (Rowan projectNamed: 'Grail') printString.
%
commit

run
Transcript show: '==============================================='.
Transcript show: ' Grail installed through Rowan'.
Transcript show: '==============================================='.
%
output pop
logout
exit 0
