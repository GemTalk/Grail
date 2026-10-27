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
| grailDir warnings symList moved project previousMigrator |
grailDir := System gemEnvironmentVariable: 'GRAIL_DIR'.
grailDir ifNil: [ ^ self error: 'GRAIL_DIR is not set' ].
warnings := OrderedCollection new.
"No Grail class named Package (#1799).  Rowan's Tonel reader resolves the
``Package { #name : ... }'' marker in every package.st through the symbol list --
before the Dictionary it was told to use, in Rowan older than masterV4 bafddb0f6,
which 4.0.0.a5 ships -- so a Grail class of that name made it fail with
'a Package does not understand #at:ifAbsent:', for Grail's own reinstall and for
every other Rowan project loaded into a Grail image.  Grail's source has had no
such class since #1722; this removes one an earlier install left:

  - one Rowan does NOT own -- made by the topaz install.gs, as GemDB's Grail
    a78e8c03 has -- is removed now, for good: nothing would ever delete it, since
    Rowan never loaded it, and keeping Grail's dictionaries on a reinstall means
    nothing rebuilds them without it.
  - one Rowan DOES own -- a Rowan install from before #1722 -- is only moved
    aside while the project is read, and put back for the load, which deletes it
    as a class the source no longer defines.

Either way it is the last install that finds one.  Only while the source being
installed defines no Package class itself."
symList := System myUserProfile symbolList.
moved := OrderedCollection new.
(GsFile existsOnServer: grailDir , '/src/Grail-PythonAst/Package.class.st') == true ifFalse: [
	#(#Python #PythonAst #EmbeddedPython #PythonTests #EmbeddedPythonTests) do: [:dictName |
		| dict cls owned |
		dict := symList objectNamed: dictName.
		cls := dict isNil ifTrue: [nil] ifFalse: [dict at: #Package otherwise: nil].
		(cls notNil and: [cls isBehavior and: [cls name = #Package]]) ifTrue: [
			owned := [(Rowan image loadedClassForClass: cls ifAbsent: [nil]) notNil]
				on: Error do: [:e | e return: true].
			dict removeKey: #Package.
			owned
				ifTrue: [moved add: dict -> cls.
					Transcript show: 'Moved Rowan''s Package class in ' , dictName , ' aside for the read']
				ifFalse: [Transcript show: 'Removed the leftover Package class from ' , dictName]]]].
[ project := Rowan projectFromUrl: 'file:' , grailDir , '/rowan/specs/Grail.ston' diskUrl: 'file:' , grailDir ]
	ensure: [ moved do: [:each | each key at: #Package put: each value ] ].
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
