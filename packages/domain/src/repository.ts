/**
 * Source control management system type.
 */
export type RepositorySource = "github" | "gitlab";

/**
 * A tracked source code repository that benchmark tasks are derived from.
 */
export type Repository = {
  readonly id: string;
  readonly owner: string;
  readonly name: string;
  readonly fullName: string;
  readonly source: RepositorySource;
  readonly cloneUrl: string;
  readonly defaultBranch: string;
  readonly language: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
};
