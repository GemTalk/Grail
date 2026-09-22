! file tests/scripts/checkSessionBudget.gs
!
! Emit the stone's session budget so run_tests.sh can refuse to start a run it
! has no room to finish.
!
! WHY THIS EXISTS.  A stone has a hard concurrent-session limit (the Community
! Edition key sets StnMaxSessions = 10), and the limit counts the stone's OWN
! permanent gems: `reclaimgcgem' and `symbolgem' hold two of the ten from the
! moment the stone starts.  That leaves EIGHT for everything else -- and
! GRAIL_TEST_WORKERS has defaulted to eight since PR #876.  So a correctly
! serialized, perfectly well-behaved suite run consumes the entire remaining
! budget with ZERO headroom, and any eleventh session at all -- an MCP/Jasper
! session left connected in an editor, an `install.sh', a topaz probe, a second
! worktree's framework deploy -- costs a SHARD its login instead.
!
! The shard that loses simply contributes nothing.  It does not fail; it is not
! counted; the runner still prints a well-formed green total.  That is the
! vacuous pass this file exists to turn into a refusal, and it is why the check
! is a PREFLIGHT rather than a postmortem: once the shards have raced for the
! last slot the measurement is already spoiled.
!
! `free' is the number of slots a shard could take, so it EXCLUDES this probe's
! own session -- the probe exits before any shard logs in.
login
run
| max inuse free |
max := System stoneConfigurationAt: #StnMaxSessions.
inuse := System currentSessions size.
"This probe holds one of `inuse' and releases it before the shards start."
free := max - (inuse - 1).
GsFile stdout nextPutAll:
  'GRAIL_SESSION_BUDGET|max=', max printString,
  '|inuse=', inuse printString,
  '|free=', free printString;
  lf.
^ free
%
logout
