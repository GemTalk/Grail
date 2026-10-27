! file tests/upgrade/reload_rowan.gs -- run by tests/scripts/run_grail_upgrade_test.sh
! when GRAIL_UPGRADE_RELOAD_ROWAN names an externals directory.
!
! Reload Rowan and RowanClientServices, in place, into a LIVE database: one that
! already has Grail and an application's committed data in it. The same load as
! Rowan's tests/bin/rowanUnitTest.stone without the test components, from the
! checkouts under $EXTERNALS_ST_BASE (RowanV3 = a Rowan masterV4 checkout, plus
! RowanClientServicesV3 and the other projects Rowan's load specs name -- the
! layout the GemStone build's externals_st directory has).
!
! This is the path that would let an existing database get a newer Rowan
! without recreating it (docs/Releases_and_Rowan.md, option b): the upgrade test
! runs it between installing Grail n and m, and the data must survive it.
iferr 1 stack
iferr 2 exit 1
set user SystemUser pass swordfish
login
run
| ext loadSpecs rowanProject |
ext := System gemEnvironmentVariable: 'EXTERNALS_ST_BASE'.
ext isNil ifTrue: [ ^ self error: 'EXTERNALS_ST_BASE is not set' ].
rowanProject := Rowan projectNamed: 'Rowan'.
loadSpecs := rowanProject loadedLoadSpecifications.
(Rowan projectNamed: 'RowanClientServices') loadedLoadSpecifications
	do: [:loadSpec | loadSpecs addLoadSpec: loadSpec ].
loadSpecs do: [:loadSpec |
	((loadSpec specName = 'Rowan') or: [ loadSpec specName = 'RowanClientServices' ])
		ifTrue: [ loadSpec gitUrl: 'file:', ext, '/', loadSpec projectAlias ]
		ifFalse: [ | relRoot |
			relRoot := loadSpec relativeRepositoryRoot.
			relRoot isEmpty
				ifTrue: [ loadSpec gitUrl: 'file:', ext, '/', loadSpec projectAlias ]
				ifFalse: [ loadSpec gitUrl: 'file:', ext, '/', rowanProject projectAlias, '/', relRoot ] ].
	loadSpec projectsHome: '$ROWAN_PROJECTS_HOME' ].
[ loadSpecs load ] on: CompileWarning do: [:ex |
	(ex description includesString: 'not optimized') ifFalse: [ GsFile gciLogServer: 'COMPILE WARNING ', ex asString ].
	ex resume ].
System commit.
GsFile stdout nextPutAll: 'reload_rowan: reloaded ', (Rowan projectNamed: 'Rowan') printString; lf.
%
logout
exit 0
