
# TODO

* [ ] Create a README.md
* [ ] Adjust wait logic after hitting save, delete, etc - ensure that buttons cannot be pressed multiple times when waiting for actions to occur
* [x] Move storage of entries into IndexDB, currently the only thing stored there is the key used to decrypt the entires from Localstorage
* [ ] Visualisation options to see how the users mood has looked over time (based on Level 1)
* [ ] Default date seems to not be in sync with timezone. In New Zealand it was defaulting to the day before until later in the day.
* [ ] Include information to the user about how many records they have locally that are yet to be synced
* [x] Ensure there is cache busting on deploying to production
