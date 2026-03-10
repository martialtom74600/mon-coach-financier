export class ServiceError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ServiceError';
  }

  static notFound(resource: string) {
    return new ServiceError(`${resource} introuvable`, 404, 'NOT_FOUND');
  }

  static forbidden() {
    return new ServiceError('Oups, on ne trouve pas ou t\'as pas accès.', 404, 'FORBIDDEN');
  }

  static internal(detail?: string) {
    return new ServiceError(detail ?? 'Oups, petit bug de notre côté. Réessaie dans un instant ?', 500, 'INTERNAL');
  }
}
