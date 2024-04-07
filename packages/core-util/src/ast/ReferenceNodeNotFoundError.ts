export class ReferenceNodeNotFoundError extends Error {

  readonly targetId: number;

  constructor(targetId: number) {
    super(`Queried for node with id ${targetId}, but it could not be found. Some transformation made the node tree out-of-sync.`);

    this.targetId = targetId;

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, ReferenceNodeNotFoundError.prototype);
  }
}
